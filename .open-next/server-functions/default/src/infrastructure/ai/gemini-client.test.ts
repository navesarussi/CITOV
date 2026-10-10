import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isRetryableGeminiError } from "./gemini-client";

describe("gemini-client", () => {
  it("detects retryable rate-limit errors", () => {
    assert.equal(isRetryableGeminiError(new Error("429 Too Many Requests")), true);
    assert.equal(isRetryableGeminiError(new Error("503 Service Unavailable")), true);
    assert.equal(isRetryableGeminiError(new Error("RESOURCE_EXHAUSTED")), true);
  });

  it("ignores non-retryable errors", () => {
    assert.equal(isRetryableGeminiError(new Error("400 invalid API key")), false);
    assert.equal(isRetryableGeminiError(new Error("401 unauthorized")), false);
  });
});
