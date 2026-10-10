/** USD per token — update when Google publishes new list prices. */
export const GEMINI_PRICING = {
  "gemini-2.5-flash": { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
  "gemini-embedding-001": { input: 0.025 / 1_000_000, output: 0 },
  default: { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
} as const;

export function estimateCostUsd(
  model: keyof typeof GEMINI_PRICING | "default",
  promptTokens: number,
  completionTokens: number,
): number {
  const row = GEMINI_PRICING[model in GEMINI_PRICING ? model : "default"];
  return promptTokens * row.input + completionTokens * row.output;
}
