import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import { emptyCandidateCard, emptyJobCard, type StoreData } from "@/domain/types";
import { applyChatRowsToStore, chatRowsFromStore } from "./chat-messages";

describe("chat message isolation", () => {
  it("keeps employee and employer chats separate for the same user id", () => {
    const store: StoreData = {
      users: [],
      employees: [
        {
          userId: "u1",
          card: emptyCandidateCard(),
          chat: [{ id: "e1", role: "user", content: "אני מועמד", createdAt: "2026-01-01T00:00:00.000Z" }],
          pendingFieldQuestionIds: [],
        },
      ],
      employers: [
        normalizeEmployerRecord({
          userId: "u1",
          card: emptyJobCard(),
          chat: [],
          jobs: [
            {
              id: "j1",
              card: emptyJobCard(),
              chat: [{ id: "b1", role: "user", content: "אני מעסיק", createdAt: "2026-01-02T00:00:00.000Z" }],
            },
          ],
          activeJobId: "j1",
        }),
      ],
      fieldQuestions: [],
      fieldAnswers: [],
      matches: [],
    };

    const rows = chatRowsFromStore(store);
    assert.equal(rows.length, 2);
    assert.equal(rows.some((r) => r.conversationContext === "employee"), true);
    assert.equal(rows.some((r) => r.conversationContext === "employer" && r.jobId === "j1"), true);

    const restored = applyChatRowsToStore(store, rows.map((r) => ({
      id: r.id,
      owner_user_id: r.ownerUserId,
      conversation_context: r.conversationContext,
      job_id: r.jobId,
      role: r.role,
      content: r.content,
      created_at: r.createdAt,
    })));

    assert.equal(restored.employees[0]!.chat[0]!.content, "אני מועמד");
    assert.equal(restored.employers[0]!.jobs[0]!.chat[0]!.content, "אני מעסיק");
  });

  it("persists chats for every employer job slot", () => {
    const employer = normalizeEmployerRecord({
      userId: "boss",
      card: emptyJobCard(),
      chat: [],
      jobs: [
        {
          id: "j1",
          card: emptyJobCard(),
          chat: [{ id: "m1", role: "user", content: "משרה 1", createdAt: "2026-01-01T00:00:00.000Z" }],
        },
        {
          id: "j2",
          card: emptyJobCard(),
          chat: [{ id: "m2", role: "user", content: "משרה 2", createdAt: "2026-01-02T00:00:00.000Z" }],
        },
      ],
      activeJobId: "j1",
    });
    const rows = chatRowsFromStore({
      users: [],
      employees: [],
      employers: [employer],
      fieldQuestions: [],
      fieldAnswers: [],
      matches: [],
    });
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((r) => r.jobId).sort(),
      ["j1", "j2"],
    );
  });
});
