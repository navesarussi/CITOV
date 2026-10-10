import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAiUsageRecord } from "./ai-usage";

describe("ai-usage logging", () => {
  it("builds a usage row with token totals", () => {
    const rec = buildAiUsageRecord({
      type: "employee_intake",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      userId: "test-user",
      model: "gemini-flash-latest",
    });
    assert.ok(rec);
    assert.equal(rec!.promptTokens, 10);
    assert.equal(rec!.completionTokens, 5);
  });
});
