import { readFileSync } from "node:fs";
import { join } from "node:path";
import { matchingEvalDataset } from "../../eval/matching/dataset";
import { scoreMatch } from "@/domain/matching";
import {
  defaultRuleBasedMatcher,
  evaluateMatcherOnDataset,
} from "@/domain/matching-eval/evaluate";
import type {
  EvalCandidate,
  EvalJob,
  EvalLabel,
  MatcherDefinition,
  MatchingEvalDataset,
} from "@/domain/matching-eval/types";
import { jobCandidateFieldRows, type LabelFieldRow } from "@/domain/labeling-field-map";
import type { CompanyCard } from "@/domain/company-card";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import type { CandidateCard, JobCard, StoreData } from "@/domain/types";
import { readQueueThreshold } from "./matching-config";
import { scoreCandidateForJob, type MatchEmbeddingIndex } from "./match-scoring";
import { labeledPairKeys, listMatchLabels } from "@/infrastructure/db/match-labels";
import { resolveLabelingPair } from "./labeling-pair-resolve";
import { explainMatchPair, type MatchPairExplanation } from "./match-pair-explain";

export type LabelingPair = {
  pairId: string;
  jobId: string;
  candidateId: string;
  bucket: string;
  employerName: string;
  job: JobCard;
  candidate: CandidateCard;
  company: CompanyCard;
  fieldRows: LabelFieldRow[];
  scores: MatchPairExplanation;
};

function holdoutRowsFromFile(): {
  pair_id: string;
  job_id: string;
  candidate_id: string;
}[] {
  try {
    const p = join(process.cwd(), "eval/matching/labeling/holdout-v1.pairs.json");
    return JSON.parse(readFileSync(p, "utf8")) as ReturnType<typeof holdoutRowsFromFile>;
  } catch {
    return [];
  }
}

export function storeToEvalEntities(store: StoreData): {
  jobs: EvalJob[];
  candidates: EvalCandidate[];
} {
  const jobs: EvalJob[] = [];
  for (const raw of store.employers) {
    const emp = normalizeEmployerRecord(raw);
    for (const slot of emp.jobs) {
      jobs.push({ id: slot.id, card: slot.card });
    }
  }
  const candidates = store.employees.map((e) => ({
    id: e.userId,
    card: e.card,
  }));
  return { jobs, candidates };
}

function embeddingVectors(
  index: MatchEmbeddingIndex | undefined,
  jobId: string,
  candidateId: string,
): { candidate: import("@/domain/semantic-matching").SegmentVectors; job: import("@/domain/semantic-matching").SegmentVectors } | undefined {
  if (!index) return undefined;
  const cVec =
    index.candidate.get(candidateId) ??
    index.candidate.get(`seed-${candidateId}`);
  const jVec = index.job.get(jobId);
  if (!cVec || !jVec) return undefined;
  return { candidate: cVec, job: jVec };
}

export function getLabelingPair(
  store: StoreData,
  jobId: string,
  candidateId: string,
  index: MatchEmbeddingIndex | undefined,
  bucket = "review",
): LabelingPair | null {
  return buildRichPair(store, jobId, candidateId, bucket, index);
}

function buildRichPair(
  store: StoreData,
  jobId: string,
  candidateId: string,
  bucket: string,
  index?: MatchEmbeddingIndex,
): LabelingPair | null {
  const resolved = resolveLabelingPair(store, jobId, candidateId);
  if (!resolved) return null;
  const vectors = embeddingVectors(index, jobId, candidateId);
  const scores = explainMatchPair({
    candidate: resolved.candidate,
    job: resolved.job,
    candidateId,
    jobId,
    vectors,
    adminSettings: store.adminSettings,
  });
  return {
    pairId: `${jobId}__${candidateId}`,
    jobId,
    candidateId,
    bucket,
    employerName: resolved.employerName,
    job: resolved.job,
    candidate: resolved.candidate,
    company: resolved.company,
    fieldRows: jobCandidateFieldRows(resolved.job, resolved.candidate),
    scores,
  };
}

export async function nextLabelingPairs(
  store: StoreData,
  index: MatchEmbeddingIndex | undefined,
  limit = 1,
): Promise<LabelingPair[]> {
  const labeled = await labeledPairKeys();
  const out: LabelingPair[] = [];

  for (const row of holdoutRowsFromFile()) {
    if (out.length >= limit) break;
    const key = `${row.job_id}:${row.candidate_id}`;
    if (labeled.has(key)) continue;
    const rich = buildRichPair(store, row.job_id, row.candidate_id, "holdout", index);
    if (rich) {
      out.push(rich);
      continue;
    }
  }

  if (out.length >= limit) return out.slice(0, limit);

  const { jobs, candidates } = storeToEvalEntities(store);
  const scored: { job: EvalJob; cand: EvalCandidate; rule: number; hybrid: number }[] = [];
  for (const job of jobs) {
    for (const cand of candidates) {
      const key = `${job.id}:${cand.id}`;
      if (labeled.has(key)) continue;
      const rule = scoreMatch(cand.card, job.card);
      const hybrid = scoreCandidateForJob({
        candidate: cand.card,
        job: job.card,
        candidateId: cand.id,
        jobId: job.id,
        index,
        mode: "hybrid",
      }).score;
      if (Math.abs(rule - hybrid) < 0.18) continue;
      scored.push({ job, cand, rule, hybrid });
    }
  }
  scored.sort((a, b) => Math.abs(b.hybrid - b.rule) - Math.abs(a.hybrid - a.rule));
  for (const s of scored) {
    if (out.length >= limit) break;
    const rich = buildRichPair(store, s.job.id, s.cand.id, "disagreement", index);
    if (rich) out.push(rich);
  }
  return out.slice(0, limit);
}

export async function buildDatasetFromDbLabels(store: StoreData): Promise<MatchingEvalDataset | null> {
  const rows = (await listMatchLabels()).filter((r) => r.source === "admin");
  if (!rows.length) return null;
  const labels: EvalLabel[] = rows.map((r) => ({
    jobId: r.jobId,
    candidateId: r.candidateId,
    label: r.label,
    reason: r.note ?? undefined,
  }));
  const { jobs, candidates } = storeToEvalEntities(store);
  const evalJobs = new Map(matchingEvalDataset.jobs.map((j) => [j.id, j.card]));
  const evalCands = new Map(matchingEvalDataset.candidates.map((c) => [c.id, c.card]));
  const jobOut = [...jobs];
  const candOut = [...candidates];
  for (const l of labels) {
    if (!jobOut.some((j) => j.id === l.jobId) && evalJobs.has(l.jobId)) {
      jobOut.push({ id: l.jobId, card: evalJobs.get(l.jobId)! });
    }
    if (!candOut.some((c) => c.id === l.candidateId) && evalCands.has(l.candidateId)) {
      candOut.push({ id: l.candidateId, card: evalCands.get(l.candidateId)! });
    }
    const seedId = `seed-${l.candidateId}`;
    if (!candOut.some((c) => c.id === seedId)) {
      const emp = store.employees.find((e) => e.userId === seedId);
      if (emp) candOut.push({ id: seedId, card: emp.card });
    }
  }
  return {
    version: "db-labels-live",
    description: "Live labels from match_labels table",
    jobs: jobOut.filter((j) => labels.some((l) => l.jobId === j.id)),
    candidates: candOut.filter((c) => {
      const bare = c.id.replace(/^seed-/, "");
      return labels.some((l) => l.candidateId === c.id || l.candidateId === bare);
    }),
    labels,
  };
}

export function productionHybridMatcher(index?: MatchEmbeddingIndex): MatcherDefinition {
  return {
    id: "hybrid-production",
    label: "Hybrid (production)",
    score: (candidate, job, ctx) =>
      scoreCandidateForJob({
        candidate,
        job,
        candidateId: ctx?.candidateId ?? "",
        jobId: ctx?.jobId ?? "",
        index,
        mode: "hybrid",
      }).score,
  };
}

export async function liveLabelingMetrics(store: StoreData, index?: MatchEmbeddingIndex) {
  const dataset = await buildDatasetFromDbLabels(store);
  const totalLabels = await listMatchLabels().then((r) => r.length);
  const minRequired = 3;
  if (!dataset || dataset.labels.length < minRequired) {
    return {
      totalLabels,
      ready: false,
      minRequired,
      message: `נדרשות לפחות ${minRequired} תיוגים להערכת מטריקות (כרגע ${totalLabels})`,
    };
  }
  const matchers = [defaultRuleBasedMatcher, productionHybridMatcher(index)];
  const thresholds = [0.28, readQueueThreshold(store.adminSettings)];
  const results = matchers.map((m, i) =>
    evaluateMatcherOnDataset(dataset, m, 5, thresholds[i] ?? 0.28),
  );
  return {
    totalLabels,
    ready: true,
    minRequired,
    labeledPairs: dataset.labels.length,
    matchers: results.map((r) => ({
      id: r.matcherId,
      threshold: r.threshold,
      precisionAt5: r.macroPrecisionAtK,
      recallAt5: r.macroRecallAtK,
      ndcgAt5: r.macroNdcgAtK,
      goodMissed: r.confusion.goodMissed.length,
      badQueued: r.confusion.badQueued.length,
    })),
  };
}

export function scoresForPair(
  store: StoreData,
  jobId: string,
  candidateId: string,
  index?: MatchEmbeddingIndex,
): { ruleScore: number; hybridScore: number; matcherVersion: string } {
  const resolved = resolveLabelingPair(store, jobId, candidateId);
  if (!resolved) {
    return { ruleScore: 0, hybridScore: 0, matcherVersion: "n/a" };
  }
  const vectors = embeddingVectors(index, jobId, candidateId);
  const ex = explainMatchPair({
    candidate: resolved.candidate,
    job: resolved.job,
    candidateId,
    jobId,
    vectors,
    adminSettings: store.adminSettings,
  });
  return {
    ruleScore: ex.ruleScore,
    hybridScore: ex.hybridScore,
    matcherVersion: "hybrid-production",
  };
}
