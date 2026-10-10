/**
 * USD per token — Google AI Gemini API list pricing (paid tier).
 * Source: https://ai.google.dev/gemini-api/docs/pricing
 * As-of: 2026-10-10 (Gemini 2.5 Flash / Pro standard ≤200k context; text embedding-001 legacy row).
 */

export const GEMINI_LIST_PRICING_AS_OF = "2026-10-10";
export const GEMINI_PRICING_SOURCE_URL = "https://ai.google.dev/gemini-api/docs/pricing";

export const GEMINI_PRICING = {
  /** $0.30 / 1M input, $2.50 / 1M output (thinking billed as output). */
  "gemini-2.5-flash": { input: 0.3 / 1_000_000, output: 2.5 / 1_000_000 },
  /** Standard tier, prompts ≤ 200k tokens. */
  "gemini-2.5-pro": { input: 1.25 / 1_000_000, output: 10 / 1_000_000 },
  /** Legacy text embeddings model used in-app. */
  "gemini-embedding-001": { input: 0.025 / 1_000_000, output: 0 },
  default: { input: 0.3 / 1_000_000, output: 2.5 / 1_000_000 },
} as const;

/** Cached input list price is $0.03 / 1M vs $0.30 / 1M fresh (~10%). */
export const GEMINI_CACHED_INPUT_MULTIPLIER = 0.1;

export type GeminiPricingKey = keyof typeof GEMINI_PRICING;

/** Map runtime model id to a pricing table row. */
export function resolveGeminiPricingKey(model?: string | null): GeminiPricingKey {
  const m = (model ?? "").toLowerCase();
  if (m.includes("embedding")) return "gemini-embedding-001";
  if (m.includes("2.5-pro") || m.includes("2-5-pro")) return "gemini-2.5-pro";
  if (m.includes("2.5-flash") || m.includes("2-5-flash")) return "gemini-2.5-flash";
  return "default";
}

export function estimateCostUsd(
  model: GeminiPricingKey | string,
  promptTokens: number,
  completionTokens: number,
  cachedPromptTokens = 0,
): number {
  const key = typeof model === "string" && model in GEMINI_PRICING
    ? (model as GeminiPricingKey)
    : resolveGeminiPricingKey(model);
  const row = GEMINI_PRICING[key in GEMINI_PRICING ? key : "default"];
  const cached = Math.min(Math.max(0, cachedPromptTokens), promptTokens);
  const freshInput = promptTokens - cached;
  return (
    freshInput * row.input +
    cached * row.input * GEMINI_CACHED_INPUT_MULTIPLIER +
    completionTokens * row.output
  );
}

export function estimateCacheSavingsUsd(
  model: GeminiPricingKey | string,
  cachedPromptTokens: number,
): number {
  if (cachedPromptTokens <= 0) return 0;
  const key = typeof model === "string" && model in GEMINI_PRICING
    ? (model as GeminiPricingKey)
    : resolveGeminiPricingKey(model);
  const row = GEMINI_PRICING[key in GEMINI_PRICING ? key : "default"];
  return cachedPromptTokens * row.input * (1 - GEMINI_CACHED_INPUT_MULTIPLIER);
}
