import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countUserMessages,
  mean,
  storeEngagementStats,
  employerEngagement,
} from "./admin-engagement";
import type { StoreData } from "./types";
import { emptyCandidateCard, emptyJobCard } from "./types";
import { normalizeEmployerRecord, createJobSlot } from "./employer-jobs";

describe("admin-engagement", () => {
  it("counts only user-role messages", () => {
    assert.equal(
      countUserMessages([
        { id: "1", role: "assistant", content: "a", createdAt: "t" },
        { id: "2", role: "user", content: "b", createdAt: "t" },
        { id: "3", role: "user", content: "c", createdAt: "t" },
      ]),
      2,
    );
  });

  it("mean of empty is 0", () => {
    assert.equal(mean([]), 0);
  });

  it("averages knowledge and user messages excluding demo", () => {
    const filled = { ...emptyCandidateCard(), desiredRole: "Dev", field: "Tech", location: "TLV" };
    const store: StoreData = {
      users: [],
      employees: [
        {
          userId: "demo-employee",
          card: filled,
          chat: [{ id: "1", role: "user", content: "x", createdAt: "t" }],
          pendingFieldQuestionIds: [],
        },
        {
          userId: "c1",
          card: filled,
          chat: [
            { id: "1", role: "user", content: "x", createdAt: "t" },
            { id: "2", role: "assistant", content: "y", createdAt: "t" },
            { id: "3", role: "user", content: "z", createdAt: "t" },
          ],
          pendingFieldQuestionIds: [],
        },
      ],
      employers: [
        normalizeEmployerRecord({
          userId: "e1",
          card: emptyJobCard(),
          chat: [],
          jobs: [
            createJobSlot({
              id: "j1",
              card: { ...emptyJobCard(), title: "A", field: "Tech" },
              chat: [{ id: "1", role: "user", content: "u", createdAt: "t" }],
            }),
            createJobSlot({
              id: "j2",
              card: emptyJobCard(),
              chat: [
                { id: "1", role: "user", content: "u", createdAt: "t" },
                { id: "2", role: "user", content: "v", createdAt: "t" },
              ],
            }),
          ],
          activeJobId: "j1",
        }),
      ],
      fieldQuestions: [],
      fieldAnswers: [],
      matches: [],
    };
    const s = storeEngagementStats(store);
    assert.equal(s.avgCandidateUserMessages, 2);
    assert.ok(s.avgCandidateKnowledgePercent > 0);
    assert.equal(s.avgEmployerUserMessages, 1.5);
    assert.ok(s.avgJobKnowledgePercent >= 0);
  });

  it("employerEngagement averages across jobs", () => {
    const er = normalizeEmployerRecord({
      userId: "e1",
      card: emptyJobCard(),
      chat: [],
      jobs: [
        createJobSlot({
          id: "j1",
          chat: [{ id: "1", role: "user", content: "a", createdAt: "t" }],
        }),
        createJobSlot({
          id: "j2",
          chat: [
            { id: "1", role: "user", content: "a", createdAt: "t" },
            { id: "2", role: "user", content: "b", createdAt: "t" },
          ],
        }),
      ],
      activeJobId: "j1",
    });
    const e = employerEngagement(er);
    assert.equal(e.jobCount, 2);
    assert.equal(e.avgUserMessages, 1.5);
  });
});
