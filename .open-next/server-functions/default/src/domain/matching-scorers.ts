import { combineFlexibility, computeBaseFit, scoreFromBase, scoreMatch } from "./matching";
import type { SegmentVectors } from "./semantic-matching";
import {
  buildSemanticOptions,
  computeHybridBaseFit,
  computeSemanticMatchBase,
  DEFAULT_HYBRID_WEIGHTS,
  type HybridWeights,
} from "./semantic-matching";
import type { CandidateCard, JobCard } from "./types";

export type MatchScoreMode = "rule" | "semantic" | "hybrid";

function scoreFromSemanticBase(
  base: number,
  candidate: CandidateCard,
  job: JobCard,
): number {
  return scoreFromBase(base, candidate, job);
}

export function scoreSemanticMatch(
  candidate: CandidateCard,
  job: JobCard,
  candidateVec: SegmentVectors,
  jobVec: SegmentVectors,
): number {
  const opts = buildSemanticOptions(candidate, job);
  const base = computeSemanticMatchBase(candidate, job, candidateVec, jobVec, opts);
  return scoreFromSemanticBase(base, candidate, job);
}

export function scoreHybridMatch(
  candidate: CandidateCard,
  job: JobCard,
  candidateVec: SegmentVectors,
  jobVec: SegmentVectors,
  weights = DEFAULT_HYBRID_WEIGHTS,
): number {
  const opts = buildSemanticOptions(candidate, job);
  const base = computeHybridBaseFit(
    candidate,
    job,
    candidateVec,
    jobVec,
    weights,
    opts,
  );
  return scoreFromSemanticBase(base, candidate, job);
}

export function scoreWithMode(
  mode: MatchScoreMode,
  candidate: CandidateCard,
  job: JobCard,
  vectors?: { candidate: SegmentVectors; job: SegmentVectors },
  hybridWeights?: HybridWeights,
): { score: number; degraded: boolean } {
  if (mode === "rule" || !vectors) {
    return { score: scoreMatch(candidate, job), degraded: mode !== "rule" };
  }
  if (mode === "semantic") {
    return {
      score: scoreSemanticMatch(candidate, job, vectors.candidate, vectors.job),
      degraded: false,
    };
  }
  return {
    score: scoreHybridMatch(
      candidate,
      job,
      vectors.candidate,
      vectors.job,
      hybridWeights,
    ),
    degraded: false,
  };
}

export function rawRuleBase(candidate: CandidateCard, job: JobCard): number {
  return computeBaseFit(candidate, job);
}

export function rawHybridBase(
  candidate: CandidateCard,
  job: JobCard,
  candidateVec: SegmentVectors,
  jobVec: SegmentVectors,
  weights = DEFAULT_HYBRID_WEIGHTS,
): number {
  const opts = buildSemanticOptions(candidate, job);
  return computeHybridBaseFit(candidate, job, candidateVec, jobVec, weights, opts);
}

export { combineFlexibility };
