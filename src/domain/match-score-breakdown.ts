import type { MatchScoreMode } from "./matching-scorers";
import type { HybridWeights } from "./semantic-matching";

/** Bump when scoring logic or default config changes (stored on each match). */
export const MATCH_ENGINE_VERSION = "2026-10-10-hybrid-v2";

export type RuleComponentScores = {
  role: number;
  field: number;
  location: number;
  skills: number;
  soft: number;
  languages: number;
  personality: number;
  culture: number;
  salary: number;
  mustPenalty: number;
  baseFit: number;
};

export type SegmentCosineBreakdown = {
  role: { raw: number; calibrated: number };
  skills: { raw: number; calibrated: number };
  profile: { raw: number; calibrated: number };
  weightedRaw: number;
  calibratedOverall: number;
};

export type MatchScoreBreakdown = {
  engineVersion: typeof MATCH_ENGINE_VERSION;
  mode: MatchScoreMode;
  effectiveMode: MatchScoreMode;
  degraded: boolean;
  config: {
    hybridWeights: HybridWeights;
    cosineFloor: number;
    queueThreshold: number;
    embeddingModel: string;
    roleBoostEnabled: boolean;
  };
  rule: RuleComponentScores;
  semantic: SegmentCosineBreakdown | null;
  hybrid: {
    preGateBlend: number;
    roleBoostApplied: boolean;
    roleCalibrated: number;
    ruleRoleScore: number;
    postRoleBoost: number;
    mustHaveOverlap: number;
    mustHaveLanguageGap: boolean;
    afterMustHaveGate: number;
  } | null;
  flexibility: {
    combined: number;
    baseBeforeFlex: number;
    finalScore: number;
  };
  threshold: number;
  queued: boolean;
  /** Short Hebrew bullets for candidates (top reasons). */
  candidateReasonsHe: string[];
};
