import type { EmbeddingSegment } from "./card-embedding-text";
import { cosineSimilarity, cosineToUnitFit } from "./vector-similarity";
import type { CandidateCard, JobCard } from "./types";
import { computeBaseFit } from "./matching";

export type SegmentVectors = Partial<Record<EmbeddingSegment, number[]>>;

export const DEFAULT_SEGMENT_WEIGHTS: Record<EmbeddingSegment, number> = {
  role: 0.45,
  skills: 0.35,
  profile: 0.2,
};

/** Weighted mean of segment cosines; missing segments are skipped. */
export function computeSemanticSimilarity(
  candidate: SegmentVectors,
  job: SegmentVectors,
  weights: Record<EmbeddingSegment, number> = DEFAULT_SEGMENT_WEIGHTS,
): number {
  let sum = 0;
  let wSum = 0;
  for (const seg of Object.keys(weights) as EmbeddingSegment[]) {
    const a = candidate[seg];
    const b = job[seg];
    if (!a?.length || !b?.length) continue;
    sum += weights[seg] * cosineSimilarity(a, b);
    wSum += weights[seg];
  }
  if (wSum === 0) return 0;
  return sum / wSum;
}

export function computeSemanticBaseFit(
  candidateVec: SegmentVectors,
  jobVec: SegmentVectors,
): number {
  return cosineToUnitFit(computeSemanticSimilarity(candidateVec, jobVec));
}

/** Rule must-have penalty only (keeps structured gates out of vectors). */
export function computeMustHavePenalty(candidate: CandidateCard, job: JobCard): number {
  if (job.mustHaves.length === 0) return 0;
  const pool = candidate.skills.concat(candidate.desiredRole, candidate.licenses);
  const norm = (s: string) => s.trim().toLowerCase();
  const set = new Set(pool.map(norm));
  const hits = job.mustHaves.filter((m) => set.has(norm(m))).length;
  return 1 - hits / job.mustHaves.length;
}

export function computeSemanticMatchBase(
  candidate: CandidateCard,
  job: JobCard,
  candidateVec: SegmentVectors,
  jobVec: SegmentVectors,
): number {
  const sem = computeSemanticBaseFit(candidateVec, jobVec);
  const penalty = computeMustHavePenalty(candidate, job);
  return Math.max(0, Math.min(1, sem - penalty * 0.12));
}

export type HybridWeights = {
  semantic: number;
  rule: number;
};

export const DEFAULT_HYBRID_WEIGHTS: HybridWeights = {
  semantic: 0.55,
  rule: 0.45,
};

export function computeHybridBaseFit(
  candidate: CandidateCard,
  job: JobCard,
  candidateVec: SegmentVectors,
  jobVec: SegmentVectors,
  weights: HybridWeights = DEFAULT_HYBRID_WEIGHTS,
): number {
  const rule = computeBaseFit(candidate, job);
  const sem = computeSemanticMatchBase(candidate, job, candidateVec, jobVec);
  const wSum = weights.semantic + weights.rule;
  if (wSum <= 0) return rule;
  const blend = (weights.semantic * sem + weights.rule * rule) / wSum;
  return Math.max(0, Math.min(1, blend));
}
