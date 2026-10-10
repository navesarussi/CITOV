import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAdminAiUsageDashboard } from "./admin-ai-usage";

describe("buildAdminAiUsageDashboard", () => {
  it("aggregates today and by feature", () => {
    const today = new Date().toISOString();
    const dash = buildAdminAiUsageDashboard([
      {
        id: "1",
        type: "employee_intake",
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        estimatedCostUsd: 0.001,
        createdAt: today,
        userId: "u1",
        userName: "Test",
      },
      {
        id: "2",
        type: "cv_extraction",
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
        estimatedCostUsd: 0.002,
        createdAt: today,
        userId: "u1",
        userName: "Test",
      },
    ]);
    assert.ok(dash.totals.todayUsd >= 0.003);
    assert.equal(dash.byFeature.length, 2);
    assert.equal(dash.recentCalls.length, 2);
  });
});
