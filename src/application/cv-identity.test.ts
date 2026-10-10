import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyCandidateCard, emptyCvProfile } from "@/domain/types";
import {
  commitStagedCvToOtherProfile,
  commitStagedCvToSelf,
  detectIdentityResolution,
  shouldStageIdentityMismatch,
  stageCvForIdentityCheck,
} from "./cv-identity";
import { listCandidateProfiles } from "@/domain/candidate-profiles";

const baseStore = {
  users: [{ id: "u1", name: "Lian Ben Haim", role: "employee" as const, email: "l@x.com" }],
  employees: [
    {
      userId: "u1",
      card: emptyCandidateCard(),
      chat: [],
      pendingFieldQuestionIds: [],
      cv: emptyCvProfile(),
    },
  ],
  employers: [],
  fieldQuestions: [],
  fieldAnswers: [],
  matches: [],
  adminSettings: {},
};

describe("cv-identity", () => {
  it("detects name mismatch for staging", () => {
    assert.equal(shouldStageIdentityMismatch("Lian Ben Haim", "Nave Sarussi"), true);
    assert.equal(shouldStageIdentityMismatch("Nave Sarussi", "Nave Sarussi"), false);
  });

  it("parses self vs other resolution phrases", () => {
    assert.equal(detectIdentityResolution("זה שלי"), "self");
    assert.equal(detectIdentityResolution("מישהו אחר — מגייס"), "other");
    assert.equal(detectIdentityResolution("תל אביב"), null);
  });

  it("creates separate profile when CV is for someone else", () => {
    let store = stageCvForIdentityCheck(baseStore, "u1", {
      cvPersonName: "Nave Sarussi",
      documentId: "d1",
      extraction: { patch: { desiredRole: "Developer", summary: "Nave Sarussi" } },
      analyzedDocument: {
        id: "d1",
        kind: "cv",
        fileName: "cv.pdf",
        mimeType: "application/pdf",
        byteSize: 1,
        storageKey: "k",
        uploadedAt: new Date().toISOString(),
        extractionStatus: "ok",
      },
    });
    store = commitStagedCvToOtherProfile(store, "u1", "Nave Sarussi");
    const emp = store.employees.find((e) => e.userId === "u1")!;
    assert.equal(listCandidateProfiles(emp).length, 2);
    assert.equal(emp.card.desiredRole, "Developer");
    assert.equal(emp.cv?.identityStaging, undefined);
  });

  it("commits staged CV to self profile", () => {
    let store = stageCvForIdentityCheck(baseStore, "u1", {
      cvPersonName: "Nave Sarussi",
      documentId: "d1",
      extraction: { patch: { desiredRole: "Engineer" } },
      analyzedDocument: {
        id: "d1",
        kind: "cv",
        fileName: "cv.pdf",
        mimeType: "application/pdf",
        byteSize: 1,
        storageKey: "k",
        uploadedAt: new Date().toISOString(),
        extractionStatus: "ok",
      },
    });
    store = commitStagedCvToSelf(store, "u1");
    const emp = store.employees.find((e) => e.userId === "u1")!;
    assert.equal(emp.card.desiredRole, "Engineer");
    assert.equal(listCandidateProfiles(emp).length, 1);
  });
});
