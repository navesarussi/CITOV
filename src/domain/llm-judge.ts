/** LLM judge verdict mapped to human labeling enum. */
import type { RelevanceLabel } from "@/domain/matching-eval/types";

export type LlmJudgeVerdict = {
  label: RelevanceLabel;
  reasonHe: string;
  confidence: number;
};

export type LlmJudgePairRecord = {
  jobId: string;
  candidateId: string;
  judgeA: LlmJudgeVerdict;
  judgeB: LlmJudgeVerdict & { critiqueHe: string };
  judgesAgree: boolean;
  autoSkipped: boolean;
  auditSample: boolean;
  needsOwner: boolean;
  engineScore: number;
  ruleScore: number;
  hybridScore: number;
  engineQueued: boolean;
};

/** Both judges agree with high confidence → skip owner queue (unless audit sample). */
export const LLM_JUDGE_HIGH_CONFIDENCE = 0.85;

/** Fraction of auto-skipped pairs surfaced for human audit. */
export const LLM_JUDGE_AUDIT_SAMPLE_RATE = 0.1;

export function judgesAgree(a: RelevanceLabel, b: RelevanceLabel): boolean {
  return a === b;
}

export function mapEngineDisagreement(params: {
  judgesAgree: boolean;
  agreedLabel: RelevanceLabel | null;
  engineQueued: boolean;
}): boolean {
  if (!params.judgesAgree || !params.agreedLabel) return true;
  const positive = params.agreedLabel === "good" || params.agreedLabel === "acceptable";
  return params.engineQueued !== positive;
}
