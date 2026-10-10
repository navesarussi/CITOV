/** USD per token — update when Google publishes new list prices. */
export const GEMINI_PRICING = {
  "gemini-2.5-flash": { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
  "gemini-embedding-001": { input: 0.025 / 1_000_000, output: 0 },
  default: { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
} as const;

/** Cached input is billed at ~25% of list input on Gemini 2.5 (implicit context cache). */
export const GEMINI_CACHED_INPUT_MULTIPLIER = 0.25;

export function estimateCostUsd(
  model: keyof typeof GEMINI_PRICING | "default",
  promptTokens: number,
  completionTokens: number,
  cachedPromptTokens = 0,
): number {
  const row = GEMINI_PRICING[model in GEMINI_PRICING ? model : "default"];
  const cached = Math.min(Math.max(0, cachedPromptTokens), promptTokens);
  const freshInput = promptTokens - cached;
  return (
    freshInput * row.input +
    cached * row.input * GEMINI_CACHED_INPUT_MULTIPLIER +
    completionTokens * row.output
  );
}

export function estimateCacheSavingsUsd(
  model: keyof typeof GEMINI_PRICING | "default",
  cachedPromptTokens: number,
): number {
  if (cachedPromptTokens <= 0) return 0;
  const row = GEMINI_PRICING[model in GEMINI_PRICING ? model : "default"];
  return cachedPromptTokens * row.input * (1 - GEMINI_CACHED_INPUT_MULTIPLIER);
}
