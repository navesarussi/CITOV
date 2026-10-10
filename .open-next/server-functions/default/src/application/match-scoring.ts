/**
 * נקודת כניסה לציון התאמה בפרודקשן — היברידי, כללים, סף תור (מ-adminSettings / env).
 */
import type { MatchScoreBreakdown } from "@/domain/match-score-breakdown";
import { explainMatch, shouldQueueForEmployer } from "@/domain/matching";
import type { MatchScoreMode } from "@/domain/matching-scorers";
import { scoreWithMode } from "@/domain/matching-scorers";
import type { SegmentVectors } from "@/domain/semantic-matching";
import type { HybridWeights } from "@/domain/semantic-matching";
import type { AdminSettings, CandidateCard, JobCard } from "@/domain/types";
import { buildMatchScoreBreakdown } from "./match-score-detail";
import { evaluateMatchHardFilters } from "@/domain/match-hard-filters";
import {
  readDegradedRuleQueueFloor,
  readHybridWeightsForPair,
  readMatchingMode,
  readQueueThreshold,
} from "./matching-config";

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
  const hybridWeights =
    params.hybridWeights ??
    readHybridWeightsForPair(params.candidate, params.job);
  const hard = evaluateMatchHardFilters(
    params.candidate,
    params.job,
    params.adminSettings,
  );
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
  const queueMin = degraded ? Math.max(threshold, readDegradedRuleQueueFloor()) : threshold;
  const scoreBreakdown = buildMatchScoreBreakdown({
    candidate: params.candidate,
    job: params.job,
    vectors,
    adminSettings: params.adminSettings,
    mode,
    hybridWeights,
    queueThreshold: queueMin,
  });
  const blocked = !hard.pass;
  const effectiveScore = blocked ? 0 : score;
  if (blocked) {
    reason = `hard filter: ${hard.reason}`;
  }
  return {
    score: effectiveScore,
    reason,
    queued: !blocked && effectiveScore >= queueMin,
    degraded,
    scoreBreakdown: {
      ...scoreBreakdown,
      effectiveMode,
      degraded,
      threshold: queueMin,
      queued: !blocked && effectiveScore >= queueMin,
    },
  };
}

export function queueThreshold(): number {
  return readQueueThreshold();
}

export { shouldQueueForEmployer };
