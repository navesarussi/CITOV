import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canViewCandidateCv } from "./cv-access";
import { emptyCandidateCard, emptyJobCard, type StoreData } from "./types";
import { normalizeEmployerRecord } from "./employer-jobs";

function store(): StoreData {
  return {
    users: [
      { id: "e1", name: "C", role: "employee", createdAt: "" },
      { id: "b1", name: "B", role: "employer", createdAt: "" },
      { id: "b2", name: "B2", role: "employer", createdAt: "" },
      { id: "a1", name: "A", role: "employee", email: "admin@x.com", createdAt: "" },
    ],
    employees: [
      { userId: "e1", card: emptyCandidateCard(), chat: [], pendingFieldQuestionIds: [] },
    ],
    employers: [
      normalizeEmployerRecord({
        userId: "b1",
        card: emptyJobCard(),
        chat: [],
        jobs: [],
        activeJobId: "",
      } as never),
    ],
    fieldQuestions: [],
    fieldAnswers: [],
    matches: [
      {
        id: "m1",
        jobOwnerId: "b1",
        jobId: "j1",
        candidateId: "e1",
        score: 0.9,
        reason: "",
        status: "queued",
        createdAt: "",
        updatedAt: "",
      },
    ],
  };
}

describe("canViewCandidateCv", () => {
  it("allows admin always", () => {
    assert.equal(canViewCandidateCv(store(), { userId: "a1", isAdmin: true }, "e1"), true);
  });

  it("allows matched employer", () => {
    assert.equal(canViewCandidateCv(store(), { userId: "b1", isAdmin: false }, "e1"), true);
  });

  it("denies unmatched employer", () => {
    assert.equal(canViewCandidateCv(store(), { userId: "b2", isAdmin: false }, "e1"), false);
  });

  it("denies candidate self (no full dump via this gate)", () => {
    assert.equal(canViewCandidateCv(store(), { userId: "e1", isAdmin: false }, "e1"), false);
  });
});
