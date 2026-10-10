import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAiUsageRecord, insertAiUsageRecord, listAiUsageRows } from "./ai-usage";

describe("ai-usage logging", () => {
  it("builds and inserts a usage row in memory mode", async () => {
    const rec = buildAiUsageRecord({
      type: "employee_intake",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      userId: "test-user",
      model: "gemini-flash-latest",
    });
    assert.ok(rec);
    await insertAiUsageRecord(rec!);
    const rows = await listAiUsageRows("1970-01-01T00:00:00.000Z", 10);
    assert.ok(rows.some((r) => r.id === rec!.id));
  });
});
