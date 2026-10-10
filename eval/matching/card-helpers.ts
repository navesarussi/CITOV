import type { CandidateCard, JobCard } from "../../src/domain/types";
import { emptyCandidateCard, emptyJobCard } from "../../src/domain/types";
import type { EvalCandidate, EvalJob, EvalLabel, MatchingEvalDataset } from "../../src/domain/matching-eval/types";

export function cand(id: string, patch: Partial<CandidateCard>): EvalCandidate {
  return { id, card: { ...emptyCandidateCard(), flexibility: 5, ...patch } };
}

export function job(id: string, patch: Partial<JobCard>): EvalJob {
  return { id, card: { ...emptyJobCard(), flexibility: 5, ...patch } };
}

export function lbl(
  jobId: string,
  candidateId: string,
  label: EvalLabel["label"],
  reason?: string,
): EvalLabel {
  return { jobId, candidateId, label, reason };
}

export function buildDataset(
  jobs: EvalJob[],
  candidates: EvalCandidate[],
  labels: EvalLabel[],
): MatchingEvalDataset {
  return {
    version: "2026-10-10-v1",
    description:
      "Offline Hebrew-first job/candidate matching eval set with human-style relevance labels.",
    jobs,
    candidates,
    labels,
  };
}
