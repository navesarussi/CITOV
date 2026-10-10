import { explainMatch, shouldQueueForEmployer } from "@/domain/matching";
import type { MatchScoreMode } from "@/domain/matching-scorers";
import { scoreWithMode } from "@/domain/matching-scorers";
import type { SegmentVectors } from "@/domain/semantic-matching";
import type { HybridWeights } from "@/domain/semantic-matching";
import type { CandidateCard, JobCard } from "@/domain/types";
import { readHybridWeights, readMatchingMode, readQueueThreshold } from "./matching-config";

export type MatchEmbeddingIndex = {
  candidate: Map<string, SegmentVectors>;
  job: Map<string, SegmentVectors>;
};

export function scoreCandidateForJob(params: {
  candidate: CandidateCard;
  job: JobCard;
  candidateId: string;
  jobId: string;
  index?: MatchEmbeddingIndex;
  mode?: MatchScoreMode;
  hybridWeights?: HybridWeights;
  queueThreshold?: number;
}): { score: number; reason: string; queued: boolean; degraded: boolean } {
  const mode = params.mode ?? readMatchingMode();
  const cVec = params.index?.candidate.get(params.candidateId);
  const jVec = params.index?.job.get(params.jobId);
  const vectors =
    cVec && jVec ? { candidate: cVec, job: jVec } : undefined;
  const { score, degraded } = scoreWithMode(
    mode,
    params.candidate,
    params.job,
    vectors,
    params.hybridWeights ?? readHybridWeights(),
  );
  const effectiveMode = degraded ? "rule" : mode;
  let reason = explainMatch(params.candidate, params.job, score);
  if (degraded && mode !== "rule") {
    reason += " · embeddings unavailable (rule fallback)";
  } else if (effectiveMode === "hybrid") {
    reason += " · hybrid";
  } else if (effectiveMode === "semantic") {
    reason += " · semantic";
  }
  const threshold = params.queueThreshold ?? readQueueThreshold();
  const queued = score >= threshold;
  return { score, reason, queued, degraded };
}

export function queueThreshold(): number {
  return readQueueThreshold();
}

export { shouldQueueForEmployer };
