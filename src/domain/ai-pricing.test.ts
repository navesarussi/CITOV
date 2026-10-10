import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateCostUsd, resolveGeminiPricingKey } from "./ai-pricing";

describe("ai-pricing", () => {
  it("uses Gemini 2.5 Flash list rates", () => {
    const cost = estimateCostUsd("gemini-2.5-flash", 1_000_000, 1_000_000, 0);
    assert.ok(Math.abs(cost - 2.8) < 0.001);
  });

  it("applies ~10% cached input multiplier", () => {
    const fresh = estimateCostUsd("gemini-2.5-flash", 1_000_000, 0, 0);
    const cached = estimateCostUsd("gemini-2.5-flash", 1_000_000, 0, 1_000_000);
    assert.ok(cached < fresh);
    assert.ok(Math.abs(cached - 0.03) < 0.001);
  });

  it("resolves pro model id", () => {
    assert.equal(resolveGeminiPricingKey("gemini-2.5-pro"), "gemini-2.5-pro");
    const cost = estimateCostUsd("gemini-2.5-pro", 1_000_000, 0, 0);
    assert.ok(Math.abs(cost - 1.25) < 0.001);
  });

  it("maps gemini-flash-latest to 2.5 flash output rates", () => {
    assert.equal(resolveGeminiPricingKey("gemini-flash-latest"), "gemini-2.5-flash");
    const outputHeavy = estimateCostUsd("gemini-flash-latest", 0, 50_000, 0);
    assert.ok(outputHeavy > 0.1, "50k output tokens should exceed $0.10 at list price");
  });
});
