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

  it("denies employer on queued match (CV only after approved + reveal)", () => {
    assert.equal(canViewCandidateCv(store(), { userId: "b1", isAdmin: false }, "e1"), false);
  });

  it("allows verified employer on approved match when reveal enabled", () => {
    const prev = process.env.EMPLOYER_APPROVED_IDENTITY_REVEAL;
    process.env.EMPLOYER_APPROVED_IDENTITY_REVEAL = "true";
    try {
      const s = store();
      s.users = s.users.map((u) =>
        u.id === "b1" ? { ...u, employerVerified: true } : u,
      );
      s.matches = s.matches.map((m) => ({ ...m, status: "approved" as const }));
      assert.equal(canViewCandidateCv(s, { userId: "b1", isAdmin: false }, "e1"), true);
    } finally {
      if (prev === undefined) delete process.env.EMPLOYER_APPROVED_IDENTITY_REVEAL;
      else process.env.EMPLOYER_APPROVED_IDENTITY_REVEAL = prev;
    }
  });

  it("denies unmatched employer", () => {
    assert.equal(canViewCandidateCv(store(), { userId: "b2", isAdmin: false }, "e1"), false);
  });

  it("denies candidate self (no full dump via this gate)", () => {
    assert.equal(canViewCandidateCv(store(), { userId: "e1", isAdmin: false }, "e1"), false);
  });
});
