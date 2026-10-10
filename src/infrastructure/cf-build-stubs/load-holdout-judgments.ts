import type { LlmJudgePairRecord } from "@/domain/llm-judge";

/** Workers build: holdout JSON not bundled; labeling uses DB LLM judge rows. */
export function holdoutJudgmentByPair(_jobId: string, _candidateId: string): LlmJudgePairRecord | null {
  return null;
}

export function loadHoldoutJudgmentsMap(): Map<string, LlmJudgePairRecord> {
  return new Map();
}

export function holdoutJudgmentCount(): number {
  return 0;
}
