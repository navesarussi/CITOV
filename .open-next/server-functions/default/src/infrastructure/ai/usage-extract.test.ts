import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractGeminiUsage, mergeAiTokenUsage } from "./usage-extract";

describe("extractGeminiUsage", () => {
  it("reads cacheReadTokens from inputTokenDetails", () => {
    const u = extractGeminiUsage({
      promptTokens: 1000,
      completionTokens: 50,
      inputTokenDetails: { cacheReadTokens: 800, noCacheTokens: 200 },
    });
    assert.equal(u?.cachedPromptTokens, 800);
    assert.equal(u?.promptTokens, 1000);
  });

  it("falls back to cachedInputTokens", () => {
    const u = extractGeminiUsage({
      inputTokens: 500,
      outputTokens: 20,
      cachedInputTokens: 400,
    });
    assert.equal(u?.cachedPromptTokens, 400);
  });

  it("returns undefined for empty usage", () => {
    assert.equal(extractGeminiUsage(undefined), undefined);
    assert.equal(extractGeminiUsage({ promptTokens: 0, completionTokens: 0 }), undefined);
  });

  it("mergeAiTokenUsage sums thinking and cached tokens", () => {
    const merged = mergeAiTokenUsage(
      {
        promptTokens: 100,
        completionTokens: 10,
        thinkingTokens: 5,
        cachedPromptTokens: 20,
        totalTokens: 115,
      },
      {
        promptTokens: 50,
        completionTokens: 5,
        thinkingTokens: 3,
        cachedPromptTokens: 10,
        totalTokens: 58,
      },
    );
    assert.equal(merged?.promptTokens, 150);
    assert.equal(merged?.completionTokens, 15);
    assert.equal(merged?.thinkingTokens, 8);
    assert.equal(merged?.cachedPromptTokens, 30);
  });
});
