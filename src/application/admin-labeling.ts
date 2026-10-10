import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scoreMatch } from "@/domain/matching";
import {
  defaultRuleBasedMatcher,
  evaluateMatcherOnDataset,
} from "@/domain/matching-eval/evaluate";
import type { EvalCandidate, EvalJob, EvalLabel, MatcherDefinition, MatchingEvalDataset } from "@/domain/matching-eval/types";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import type { StoreData } from "@/domain/types";
import { scoreCandidateForJob, type MatchEmbeddingIndex } from "./match-scoring";
import { labeledPairKeys, listMatchLabels } from "@/infrastructure/db/match-labels";

export type LabelingPair = {
  pairId: string;
  jobId: string;
  candidateId: string;
  jobTitle: string;
  jobSummary: string;
  candidateTitle: string;
  candidateSummary: string;
  ruleScore: number;
  hybridScore: number;
  bucket: string;
};

function holdoutRowsFromFile(): {
  pair_id: string;
  job_id: string;
  candidate_id: string;
  job_title: string;
  job_key_requirements: string;
  candidate_title: string;
  candidate_key_facts: string;
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

function scoreHybrid(
  cand: EvalCandidate,
  job: EvalJob,
  index?: MatchEmbeddingIndex,
): number {
  return scoreCandidateForJob({
    candidate: cand.card,
    job: job.card,
    candidateId: cand.id,
    jobId: job.id,
    index,
    mode: "hybrid",
  }).score;
}

export async function nextLabelingPairs(
  store: StoreData,
  index: MatchEmbeddingIndex | undefined,
  limit = 1,
): Promise<LabelingPair[]> {
  const labeled = await labeledPairKeys();
  const { jobs, candidates } = storeToEvalEntities(store);
  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const candMap = new Map(candidates.map((c) => [c.id, c]));
  const out: LabelingPair[] = [];

  for (const row of holdoutRowsFromFile()) {
    if (out.length >= limit) break;
    const key = `${row.job_id}:${row.candidate_id}`;
    if (labeled.has(key)) continue;
    const job = jobMap.get(row.job_id);
    const cand = candMap.get(row.candidate_id);
    if (job && cand) {
      out.push(buildPair(job, cand, index, "holdout"));
      continue;
    }
    out.push({
      pairId: row.pair_id,
      jobId: row.job_id,
      candidateId: row.candidate_id,
      jobTitle: row.job_title,
      jobSummary: row.job_key_requirements,
      candidateTitle: row.candidate_title,
      candidateSummary: row.candidate_key_facts,
      ruleScore: 0,
      hybridScore: 0,
      bucket: "holdout-seed",
    });
  }

  if (out.length >= limit) return out.slice(0, limit);

  const scored: LabelingPair[] = [];
  for (const job of jobs) {
    for (const cand of candidates) {
      const key = `${job.id}:${cand.id}`;
      if (labeled.has(key)) continue;
      const rule = scoreMatch(cand.card, job.card);
      const hybrid = scoreHybrid(cand, job, index);
      if (Math.abs(rule - hybrid) < 0.18) continue;
      scored.push(buildPair(job, cand, index, "disagreement", rule, hybrid));
    }
  }
  scored.sort((a, b) => Math.abs(b.hybridScore - b.ruleScore) - Math.abs(a.hybridScore - a.ruleScore));
  for (const s of scored) {
    if (out.length >= limit) break;
    if (out.some((x) => x.pairId === s.pairId)) continue;
    out.push(s);
  }
  return out.slice(0, limit);
}

function buildPair(
  job: EvalJob,
  cand: EvalCandidate,
  index: MatchEmbeddingIndex | undefined,
  bucket: string,
  ruleScore?: number,
  hybridScore?: number,
): LabelingPair {
  const rule = ruleScore ?? scoreMatch(cand.card, job.card);
  const hy = hybridScore ?? scoreHybrid(cand, job, index);
  return {
    pairId: `${job.id}__${cand.id}`,
    jobId: job.id,
    candidateId: cand.id,
    jobTitle: job.card.title,
    jobSummary: [
      job.card.location,
      job.card.mustHaves?.length ? `חובה: ${job.card.mustHaves.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    candidateTitle: cand.card.desiredRole,
    candidateSummary: [cand.card.location, cand.card.skills?.slice(0, 4).join(", ")]
      .filter(Boolean)
      .join(" · "),
    ruleScore: rule,
    hybridScore: hy,
    bucket,
  };
}

export async function buildDatasetFromDbLabels(store: StoreData): Promise<MatchingEvalDataset | null> {
  const rows = await listMatchLabels();
  if (!rows.length) return null;
  const labels: EvalLabel[] = rows.map((r) => ({
    jobId: r.jobId,
    candidateId: r.candidateId,
    label: r.label,
    reason: r.note ?? undefined,
  }));
  const { jobs, candidates } = storeToEvalEntities(store);
  const labelJobIds = new Set(labels.map((l) => l.jobId));
  const labelCandIds = new Set(labels.map((l) => l.candidateId));
  return {
    version: "db-labels-live",
    description: "Live labels from match_labels table",
    jobs: jobs.filter((j) => labelJobIds.has(j.id)),
    candidates: candidates.filter((c) => labelCandIds.has(c.id)),
    labels,
  };
}

function productionHybridMatcher(index?: MatchEmbeddingIndex): MatcherDefinition {
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
  if (!dataset || dataset.labels.length < 3) {
    return {
      totalLabels,
      ready: false,
      message: "נדרשות לפחות 3 תיוגים להערכת מטריקות",
    };
  }
  const matchers = [defaultRuleBasedMatcher, productionHybridMatcher(index)];
  const thresholds = [0.28, 0.6];
  const results = matchers.map((m, i) =>
    evaluateMatcherOnDataset(dataset, m, 5, thresholds[i] ?? 0.28),
  );
  return {
    totalLabels,
    ready: true,
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
  const { jobs, candidates } = storeToEvalEntities(store);
  const job = jobs.find((j) => j.id === jobId);
  const cand = candidates.find((c) => c.id === candidateId);
  if (!job || !cand) {
    return { ruleScore: 0, hybridScore: 0, matcherVersion: "n/a" };
  }
  const ruleScore = scoreMatch(cand.card, job.card);
  const hybridScore = scoreHybrid(cand, job, index);
  return { ruleScore, hybridScore, matcherVersion: "hybrid-production" };
}
