import type { CandidateCard, JobCard } from "../types";

export type RelevanceLabel = "good" | "acceptable" | "bad";

/** Human judgment for one (job, candidate) pair. */
export type EvalLabel = {
  jobId: string;
  candidateId: string;
  label: RelevanceLabel;
  /** Short note for failure analysis (Hebrew/English). */
  reason?: string;
};

export type EvalJob = {
  id: string;
  card: JobCard;
};

export type EvalCandidate = {
  id: string;
  card: CandidateCard;
};

export type MatchingEvalDataset = {
  version: string;
  description: string;
  jobs: EvalJob[];
  candidates: EvalCandidate[];
  labels: EvalLabel[];
};

/** Pluggable scorer: higher = better fit (same scale as production queue score). */
export type MatcherFn = (candidate: CandidateCard, job: JobCard) => number;

export type MatcherDefinition = {
  id: string;
  label: string;
  score: MatcherFn;
};

export const RELEVANCE_GAIN: Record<RelevanceLabel, number> = {
  good: 3,
  acceptable: 2,
  bad: 0,
};

export const QUEUE_THRESHOLD = 0.28;
