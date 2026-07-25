import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listAdminCandidates,
  getAdminCandidateDetail,
  listAdminEmployers,
  getAdminJobDetail,
} from "./admin-browse";
import type { StoreData } from "@/domain/types";
import { emptyCandidateCard, emptyJobCard } from "@/domain/types";
import { normalizeEmployerRecord, createJobSlot } from "@/domain/employer-jobs";

function baseStore(): StoreData {
  return {
    users: [
      { id: "c1", name: "Nave", role: "employee", email: "n@x.com", createdAt: "t" },
      { id: "e1", name: "Boss", role: "employer", email: "b@x.com", createdAt: "t" },
    ],
    employees: [
      {
        userId: "c1",
        card: { ...emptyCandidateCard(), desiredRole: "Dev" },
        chat: [{ id: "1", role: "user", content: "hi", createdAt: "t" }],
        pendingFieldQuestionIds: [],
        cv: {
          workHistory: [],
          educationHistory: [],
          unmappedFacts: [],
          fieldEvidence: [],
          conflicts: [],
          documents: [
            {
              id: "d1",
              kind: "cv",
              fileName: "cv.pdf",
              mimeType: "application/pdf",
              byteSize: 10,
              storageKey: "k",
              uploadedAt: "t",
              textCharCount: 1,
              extractedText: "x",
            },
          ],
        },
      },
      {
        userId: "demo-employee",
        card: emptyCandidateCard(),
        chat: [],
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
            card: { ...emptyJobCard(), title: "Seller" },
            chat: [{ id: "1", role: "user", content: "need", createdAt: "t" }],
          }),
        ],
        activeJobId: "j1",
      }),
    ],
    fieldQuestions: [],
    fieldAnswers: [],
    matches: [
      {
        id: "m1",
        jobOwnerId: "e1",
        jobId: "j1",
        candidateId: "c1",
        score: 0.42,
        reason: "ok",
        status: "queued",
        createdAt: "t",
        updatedAt: "t",
      },
    ],
  };
}

describe("admin-browse", () => {
  it("lists real candidates with metrics and excludes demo", () => {
    const list = listAdminCandidates(baseStore());
    assert.equal(list.length, 1);
    assert.equal(list[0]!.userId, "c1");
    assert.equal(list[0]!.userMessageCount, 1);
    assert.equal(list[0]!.hasCv, true);
  });

  it("returns candidate detail with chat, matches, cv meta", () => {
    const d = getAdminCandidateDetail(baseStore(), "c1");
    assert.ok(d);
    assert.equal(d!.chat.length, 1);
    assert.equal(d!.matches[0]!.scorePercent, 42);
    assert.equal(d!.cvDocuments[0]!.id, "d1");
  });

  it("returns null for unknown candidate", () => {
    assert.equal(getAdminCandidateDetail(baseStore(), "nope"), null);
  });

  it("lists employers and job detail", () => {
    assert.equal(listAdminEmployers(baseStore()).length, 1);
    const job = getAdminJobDetail(baseStore(), "e1", "j1");
    assert.ok(job);
    assert.equal(job!.title, "Seller");
    assert.equal(job!.matches.length, 1);
    assert.equal(job!.userMessageCount, 1);
  });
});
