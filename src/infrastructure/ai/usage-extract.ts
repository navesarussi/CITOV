import type { AiTokenUsage } from "./schemas";

type UsageLike = {
  promptTokens?: number;
  completionTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  inputTokenDetails?: {
    cacheReadTokens?: number;
    noCacheTokens?: number;
  };
  cachedInputTokens?: number;
};

/** Normalize AI SDK / Gemini usage into our intake shape. */
export function extractGeminiUsage(usage?: UsageLike | null): AiTokenUsage | undefined {
  if (!usage) return undefined;
  const promptTokens = usage.promptTokens ?? usage.inputTokens ?? 0;
  const completionTokens = usage.completionTokens ?? usage.outputTokens ?? 0;
  const cachedPromptTokens =
    usage.inputTokenDetails?.cacheReadTokens ??
    usage.cachedInputTokens ??
    0;
  if (promptTokens === 0 && completionTokens === 0) return undefined;
  return {
    promptTokens,
    completionTokens,
    totalTokens: usage.totalTokens ?? promptTokens + completionTokens,
    cachedPromptTokens: cachedPromptTokens > 0 ? cachedPromptTokens : undefined,
  };
}
