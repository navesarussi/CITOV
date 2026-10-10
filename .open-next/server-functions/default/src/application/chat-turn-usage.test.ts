import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyEmployeeTurn } from "./chat-turn";
import { emptyCandidateCard, type StoreData } from "@/domain/types";

function seed(): StoreData {
  return {
    users: [{ id: "e1", name: "Emp", role: "employee", createdAt: "" }],
    employees: [
      { userId: "e1", card: emptyCandidateCard(), chat: [], pendingFieldQuestionIds: [] },
    ],
    employers: [],
    fieldQuestions: [],
    fieldAnswers: [],
    matches: [],
  };
}

describe("applyEmployeeTurn AI usage", () => {
  it("creates two usage records when patch and reply usage are present", () => {
    const result = applyEmployeeTurn({
      store: seed(),
      userId: "e1",
      message: "שלום",
      reply: "היי",
      provider: "gemini",
      usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
      replyUsage: { promptTokens: 80, completionTokens: 40, totalTokens: 120 },
    });
    assert.equal(result.usageRecords?.length, 2);
    assert.equal(result.usageRecords?.[0]?.userId, "e1");
    assert.ok((result.usageRecords?.[0]?.estimatedCostUsd ?? 0) > 0);
  });
});
