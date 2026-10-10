import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeAiBudgetStatus } from "./ai-budget";
import type { AiUsageRecord } from "@/domain/types";

describe("ai-budget", () => {
  it("blocks when daily spend exceeds cap", () => {
    const prev = process.env.AI_BUDGET_USD_DAILY;
    process.env.AI_BUDGET_USD_DAILY = "1";
    process.env.AI_BUDGET_USD_MONTHLY = "0";
    try {
      const now = Date.parse("2026-10-10T12:00:00.000Z");
      const usage: AiUsageRecord[] = [
        {
          id: "u1",
          type: "employee_intake",
          promptTokens: 1,
          completionTokens: 1,
          totalTokens: 2,
          estimatedCostUsd: 1.2,
          createdAt: "2026-10-10T11:00:00.000Z",
        },
      ];
      const s = computeAiBudgetStatus(usage, now);
      assert.equal(s.blocked, true);
    } finally {
      if (prev === undefined) delete process.env.AI_BUDGET_USD_DAILY;
      else process.env.AI_BUDGET_USD_DAILY = prev;
      delete process.env.AI_BUDGET_USD_MONTHLY;
    }
  });
});
