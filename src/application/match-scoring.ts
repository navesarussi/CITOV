/** Single entry for production match scores (hybrid + rule fallback + queue threshold). */
import type { MatchScoreBreakdown } from "@/domain/match-score-breakdown";
import { explainMatch, shouldQueueForEmployer } from "@/domain/matching";
import type { MatchScoreMode } from "@/domain/matching-scorers";
import { scoreWithMode } from "@/domain/matching-scorers";
import type { SegmentVectors } from "@/domain/semantic-matching";
import type { HybridWeights } from "@/domain/semantic-matching";
import type { AdminSettings, CandidateCard, JobCard } from "@/domain/types";
import { buildMatchScoreBreakdown } from "./match-score-detail";
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
  adminSettings?: AdminSettings | null;
}): {
  score: number;
  reason: string;
  queued: boolean;
  degraded: boolean;
  scoreBreakdown: MatchScoreBreakdown;
} {
  const mode = params.mode ?? readMatchingMode();
  const cVec = params.index?.candidate.get(params.candidateId);
  const jVec = params.index?.job.get(params.jobId);
  const vectors =
    cVec && jVec ? { candidate: cVec, job: jVec } : undefined;
  const hybridWeights = params.hybridWeights ?? readHybridWeights();
  const { score, degraded } = scoreWithMode(
    mode,
    params.candidate,
    params.job,
    vectors,
    hybridWeights,
  );
  const effectiveMode: MatchScoreMode = degraded ? "rule" : mode;
  let reason = explainMatch(params.candidate, params.job, score);
  if (degraded && mode !== "rule") {
    reason += " · embeddings unavailable (rule fallback)";
  } else if (effectiveMode === "hybrid") {
    reason += " · hybrid";
  } else if (effectiveMode === "semantic") {
    reason += " · semantic";
  }
  const threshold = params.queueThreshold ?? readQueueThreshold(params.adminSettings ?? undefined);
  const scoreBreakdown = buildMatchScoreBreakdown({
    candidate: params.candidate,
    job: params.job,
    vectors,
    adminSettings: params.adminSettings,
    mode,
    hybridWeights,
    queueThreshold: threshold,
  });
  return {
    score,
    reason,
    queued: score >= threshold,
    degraded,
    scoreBreakdown: {
      ...scoreBreakdown,
      effectiveMode,
      degraded,
      threshold,
      queued: score >= threshold,
    },
  };
}

export function queueThreshold(): number {
  return readQueueThreshold();
}

export { shouldQueueForEmployer };
