import { scoreMatch } from "../../src/domain/matching";
import { textScore } from "../../src/domain/matching";
import { mustHaveOverlapRatio, mustHaveLanguageGap } from "../../src/domain/semantic-matching";
import type { EvalCandidate, EvalJob, EvalLabel } from "../../src/domain/matching-eval/types";
import { loadEvalEmbeddingFixture } from "./load-embed-fixture";
import { buildFixtureIndex, createEvalMatcherDefinitions } from "./eval-matchers";

export type HoldoutPairRow = {
  pair_id: string;
  job_id: string;
  job_title: string;
  job_key_requirements: string;
  candidate_id: string;
  candidate_title: string;
  candidate_key_facts: string;
  label: string;
  note: string;
  /** selection bucket (internal) */
  bucket?: string;
};

function pairKey(jobId: string, candidateId: string): string {
  return `${jobId}__${candidateId}`;
}

function hasHebrew(s: string): boolean {
  return /[\u0590-\u05FF]/.test(s);
}

function hasLatin(s: string): boolean {
  return /[A-Za-z]/.test(s);
}

function isCrossLanguage(job: EvalJob, cand: EvalCandidate): boolean {
  const jt = `${job.card.title} ${job.card.field}`;
  const ct = `${cand.card.desiredRole} ${cand.card.field}`;
  return (hasHebrew(jt) && hasLatin(ct)) || (hasLatin(jt) && hasHebrew(ct));
}

function jobRequirementsSummary(job: EvalJob): string {
  const parts = [
    job.card.location ? `מיקום: ${job.card.location}` : "",
    job.card.mustHaves.length ? `חובה: ${job.card.mustHaves.join(", ")}` : "",
    job.card.salaryRange || job.card.salaryMin
      ? `שכר: ${job.card.salaryRange || job.card.salaryMin}`
      : "",
  ].filter(Boolean);
  return parts.join(" · ") || job.card.field;
}

function candidateFactsSummary(c: EvalCandidate): string {
  const parts = [
    c.card.location ? `מיקום: ${c.card.location}` : "",
    c.card.skills.length ? `כישורים: ${c.card.skills.slice(0, 4).join(", ")}` : "",
    c.card.languages.length ? `שפות: ${c.card.languages.join(", ")}` : "",
    c.card.salaryExpectation || c.card.salaryMin
      ? `שכר: ${c.card.salaryExpectation || c.card.salaryMin}`
      : "",
  ].filter(Boolean);
  return parts.join(" · ") || c.card.field;
}

type ScoredCandidate = {
  jobId: string;
  candidateId: string;
  rule: number;
  hybrid: number;
  buckets: string[];
};

export function selectHoldoutPairs(
  jobs: EvalJob[],
  candidates: EvalCandidate[],
  trainLabels: EvalLabel[],
  targetCount = 60,
): HoldoutPairRow[] {
  const labeled = new Set(trainLabels.map((l) => pairKey(l.jobId, l.candidateId)));
  const fixture = loadEvalEmbeddingFixture();
  const hybridMatcher = fixture
    ? createEvalMatcherDefinitions(fixture).find((m) => m.id === "hybrid-calibrated-v1")
    : undefined;
  const index = fixture ? buildFixtureIndex(fixture) : null;

  const scored: ScoredCandidate[] = [];
  for (const job of jobs) {
    for (const cand of candidates) {
      const key = pairKey(job.id, cand.id);
      if (labeled.has(key)) continue;
      const rule = scoreMatch(cand.card, job.card);
      let hybrid = rule;
      if (hybridMatcher) {
        hybrid = hybridMatcher.score(cand.card, job.card, {
          candidateId: cand.id,
          jobId: job.id,
        });
      }
      const buckets: string[] = [];
      if (isCrossLanguage(job, cand)) buckets.push("cross-language");
      if (textScore(cand.card.field, job.card.field) > 0.3 && textScore(cand.card.desiredRole, job.card.title) < 0.25) {
        buckets.push("related-role");
      }
      if (mustHaveLanguageGap(cand.card, job.card) || mustHaveOverlapRatio(cand.card, job.card) < 1) {
        buckets.push("must-have-gap");
      }
      if (
        textScore(cand.card.location, job.card.location) < 0.25 &&
        cand.card.location &&
        job.card.location
      ) {
        buckets.push("location");
      }
      const sal = textScore(cand.card.salaryExpectation || cand.card.salaryMin, job.card.salaryRange || job.card.salaryMin);
      if (sal < 0.2 && (cand.card.salaryExpectation || job.card.salaryRange)) {
        buckets.push("salary");
      }
      if (Math.abs(rule - hybrid) >= 0.22) buckets.push("disagreement");
      if (rule >= 0.45 && hybrid >= 0.45) buckets.push("easy-high");
      if (rule < 0.2 && hybrid < 0.35) buckets.push("easy-low");
      if (buckets.length === 0) buckets.push("other");
      scored.push({ jobId: job.id, candidateId: cand.id, rule, hybrid, buckets });
    }
  }

  scored.sort((a, b) => Math.abs(b.rule - b.hybrid) - Math.abs(a.rule - a.hybrid));

  const quotas: Record<string, number> = {
    disagreement: 12,
    "cross-language": 10,
    "related-role": 8,
    "must-have-gap": 10,
    location: 6,
    salary: 4,
    "easy-high": 5,
    "easy-low": 5,
    other: 0,
  };

  const picked = new Map<string, ScoredCandidate>();
  const pick = (s: ScoredCandidate) => {
    const k = pairKey(s.jobId, s.candidateId);
    if (!picked.has(k)) picked.set(k, s);
  };

  for (const [bucket, quota] of Object.entries(quotas)) {
    let n = 0;
    for (const s of scored) {
      if (n >= quota) break;
      if (!s.buckets.includes(bucket)) continue;
      pick(s);
      n++;
    }
  }

  for (const s of scored) {
    if (picked.size >= targetCount) break;
    pick(s);
  }

  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const candMap = new Map(candidates.map((c) => [c.id, c]));

  return [...picked.values()].slice(0, targetCount).map((s) => {
    const job = jobMap.get(s.jobId)!;
    const cand = candMap.get(s.candidateId)!;
    return {
      pair_id: pairKey(s.jobId, s.candidateId),
      job_id: s.jobId,
      job_title: job.card.title,
      job_key_requirements: jobRequirementsSummary(job),
      candidate_id: s.candidateId,
      candidate_title: cand.card.desiredRole,
      candidate_key_facts: candidateFactsSummary(cand),
      label: "",
      note: "",
      bucket: s.buckets[0],
    };
  });
}

export function rowsToCsv(rows: HoldoutPairRow[]): string {
  const header = [
    "pair_id",
    "job_id",
    "job_title",
    "job_key_requirements",
    "candidate_id",
    "candidate_title",
    "candidate_key_facts",
    "label",
    "note",
  ];
  const esc = (v: string) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.pair_id,
        r.job_id,
        r.job_title,
        r.job_key_requirements,
        r.candidate_id,
        r.candidate_title,
        r.candidate_key_facts,
        r.label,
        r.note,
      ]
        .map(esc)
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\n")}\n`;
}
