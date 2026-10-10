import {
  MATCH_ENGINE_VERSION,
  type MatchScoreBreakdown,
  type RuleComponentScores,
} from "@/domain/match-score-breakdown";
import { combineFlexibility, computeRuleComponents, explainMatch } from "@/domain/matching";
import type { MatchScoreMode } from "@/domain/matching-scorers";
import { scoreWithMode } from "@/domain/matching-scorers";
import {
  buildSemanticOptions,
  computeCalibratedSemanticFit,
  computeHybridBaseFitDetailed,
  computeRoleSegmentSimilarity,
  computeSemanticSimilarity,
  mustHaveOverlapRatio,
  readRoleBoostEnabled,
  type HybridWeights,
  type SegmentVectors,
} from "@/domain/semantic-matching";
import { calibrateCosineSimilarity, readCosineFloor } from "@/domain/matching-calibration";
import { cosineSimilarity } from "@/domain/vector-similarity";
import type { AdminSettings, CandidateCard, JobCard } from "@/domain/types";
import { DEFAULT_EMBEDDING_MODEL } from "@/infrastructure/ai/embeddings";
import { readHybridWeights, readMatchingMode, readQueueThreshold } from "./matching-config";

function segmentRawCosines(cVec: SegmentVectors, jVec: SegmentVectors) {
  const raw = (seg: "role" | "skills" | "profile") => {
    const a = cVec[seg];
    const b = jVec[seg];
    if (!a?.length || !b?.length) return 0;
    return cosineSimilarity(a, b);
  };
  return { role: raw("role"), skills: raw("skills"), profile: raw("profile") };
}

function candidateReasonsHe(
  rule: RuleComponentScores,
  threshold: number,
  score: number,
): string[] {
  const out: string[] = [];
  if (rule.field > 0.4) out.push("תחום מקצוע דומה");
  if (rule.role > 0.4) out.push("התאמה בתפקיד");
  if (rule.location > 0.35) out.push("מיקום מתאים");
  if (rule.skills > 0.25) out.push("כישורים רלוונטיים");
  if (out.length === 0) out.push("פרופיל כללי מתאים לדרישות המשרה");
  out.push(`ציון התאמה ${(score * 100).toFixed(0)}% (סף ${(threshold * 100).toFixed(0)}%)`);
  return out.slice(0, 3);
}

export function buildMatchScoreBreakdown(params: {
  candidate: CandidateCard;
  job: JobCard;
  vectors?: { candidate: SegmentVectors; job: SegmentVectors };
  adminSettings?: AdminSettings | null;
  mode?: MatchScoreMode;
  hybridWeights?: HybridWeights;
  queueThreshold?: number;
  /** When set, documents the score used for persistence (may differ from internal re-score). */
  finalScoreOverride?: number;
}): MatchScoreBreakdown {
  const mode = params.mode ?? readMatchingMode();
  const hybridWeights = params.hybridWeights ?? readHybridWeights();
  const threshold = params.queueThreshold ?? readQueueThreshold(params.adminSettings ?? undefined);
  const floor = readCosineFloor();
  const ruleParts = computeRuleComponents(params.candidate, params.job);
  const combinedFlex = combineFlexibility(
    params.candidate.flexibility,
    params.job.flexibility,
  );

  const { score: computedScore, degraded } = scoreWithMode(
    mode,
    params.candidate,
    params.job,
    params.vectors,
    hybridWeights,
  );
  const finalScore = params.finalScoreOverride ?? computedScore;
  const effectiveMode: MatchScoreMode = degraded ? "rule" : mode;

  let baseBeforeFlex = ruleParts.baseFit;
  let hybridTrace = null;
  let semantic = null;

  if (params.vectors && !degraded && (mode === "hybrid" || mode === "semantic")) {
    const opts = buildSemanticOptions(params.candidate, params.job);
    const cal = computeCalibratedSemanticFit(params.vectors.candidate, params.vectors.job, opts);
    const raws = segmentRawCosines(params.vectors.candidate, params.vectors.job);
    const weightedRaw = computeSemanticSimilarity(
      params.vectors.candidate,
      params.vectors.job,
      opts.weights,
      opts.candidateTexts && opts.jobTexts
        ? { candidate: opts.candidateTexts, job: opts.jobTexts }
        : undefined,
    );
    semantic = {
      role: {
        raw: computeRoleSegmentSimilarity(params.vectors.candidate, params.vectors.job, opts.candidateTexts && opts.jobTexts ? { candidate: opts.candidateTexts, job: opts.jobTexts } : undefined),
        calibrated: cal.roleCalibrated,
      },
      skills: { raw: raws.skills, calibrated: calibrateCosineSimilarity(raws.skills, floor) },
      profile: { raw: raws.profile, calibrated: calibrateCosineSimilarity(raws.profile, floor) },
      weightedRaw,
      calibratedOverall: cal.calibrated,
    };
    if (mode === "hybrid") {
      hybridTrace = computeHybridBaseFitDetailed(
        params.candidate,
        params.job,
        params.vectors.candidate,
        params.vectors.job,
        hybridWeights,
        opts,
      );
      baseBeforeFlex = hybridTrace.afterMustHaveGate;
    } else {
      baseBeforeFlex = semantic.calibratedOverall;
    }
  }

  void explainMatch(params.candidate, params.job, finalScore);

  return {
    engineVersion: MATCH_ENGINE_VERSION,
    mode,
    effectiveMode,
    degraded,
    config: {
      hybridWeights,
      cosineFloor: floor,
      queueThreshold: threshold,
      embeddingModel: DEFAULT_EMBEDDING_MODEL,
      roleBoostEnabled: readRoleBoostEnabled(),
    },
    rule: ruleParts,
    semantic,
    hybrid: hybridTrace
      ? {
          preGateBlend: hybridTrace.preGateBlend,
          roleBoostApplied: hybridTrace.roleBoostApplied,
          roleCalibrated: hybridTrace.roleCalibrated,
          ruleRoleScore: hybridTrace.ruleRoleScore,
          postRoleBoost: hybridTrace.postRoleBoost,
          mustHaveOverlap: hybridTrace.mustHaveOverlap,
          mustHaveLanguageGap: hybridTrace.mustHaveLanguageGap,
          afterMustHaveGate: hybridTrace.afterMustHaveGate,
        }
      : null,
    flexibility: {
      combined: combinedFlex,
      baseBeforeFlex,
      finalScore,
    },
    threshold,
    queued: finalScore >= threshold,
    candidateReasonsHe: candidateReasonsHe(ruleParts, threshold, finalScore),
  };
}

export function scoreWithBreakdown(params: {
  candidate: CandidateCard;
  job: JobCard;
  candidateId: string;
  jobId: string;
  vectors?: { candidate: SegmentVectors; job: SegmentVectors };
  adminSettings?: AdminSettings | null;
}): {
  score: number;
  reason: string;
  queued: boolean;
  degraded: boolean;
  scoreBreakdown: MatchScoreBreakdown;
} {
  const breakdown = buildMatchScoreBreakdown({
    candidate: params.candidate,
    job: params.job,
    vectors: params.vectors,
    adminSettings: params.adminSettings,
  });
  const { score, degraded } = scoreWithMode(
    breakdown.mode,
    params.candidate,
    params.job,
    params.vectors,
    breakdown.config.hybridWeights,
  );
  let reason = explainMatch(params.candidate, params.job, score);
  if (degraded && breakdown.mode !== "rule") {
    reason += " · embeddings unavailable (rule fallback)";
  } else if (breakdown.effectiveMode === "hybrid") {
    reason += " · hybrid";
  } else if (breakdown.effectiveMode === "semantic") {
    reason += " · semantic";
  }
  return {
    score,
    reason,
    queued: breakdown.queued,
    degraded,
    scoreBreakdown: { ...breakdown, queued: score >= breakdown.threshold },
  };
}

export { mustHaveOverlapRatio };
