import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCvExtraction, applyJobDescriptionExtraction } from "./chat";
import { emptyCandidateCard, emptyJobCard, type StoreData } from "@/domain/types";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";

function seed(): StoreData {
  return {
    users: [
      { id: "e1", name: "C", role: "employee", createdAt: "" },
      { id: "b1", name: "B", role: "employer", createdAt: "" },
    ],
    employees: [
      {
        userId: "e1",
        card: { ...emptyCandidateCard(), narrative: "קיים" },
        chat: [],
        pendingFieldQuestionIds: [],
      },
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
    matches: [],
  };
}

const doc = {
  id: "d1",
  kind: "cv" as const,
  fileName: "cv.pdf",
  mimeType: "application/pdf",
  byteSize: 12,
  storageKey: "pg:d1",
  uploadedAt: "2026-07-23T00:00:00.000Z",
  textCharCount: 100,
  extractedText: "טקסט קורות חיים מלא ".repeat(200),
  extractionStatus: "ok" as const,
};

describe("applyCvExtraction", () => {
  it("merges patch into the card and stores the document without dumping raw CV into narrative", () => {
    const { store, card, summary } = applyCvExtraction(
      seed(),
      "e1",
      { patch: { desiredRole: "מלצר", field: "מסעדנות", skills: ["שירות"] } },
      doc,
    );
    assert.equal(card.desiredRole, "מלצר");
    assert.equal(card.field, "מסעדנות");
    assert.deepEqual(card.skills, ["שירות"]);
    assert.equal(card.narrative, "קיים");
    assert.ok(!card.narrative.includes("טקסט קורות חיים מלא"));
    assert.equal(store.employees[0].cv?.documents[0]?.fileName, "cv.pdf");
    assert.ok(summary.fieldsUpdated >= 2);
  });

  it("does not mutate the input store", () => {
    const input = seed();
    applyCvExtraction(input, "e1", { patch: { desiredRole: "מלצר" } }, doc);
    assert.equal(input.employees[0].card.desiredRole, "");
  });
});

describe("applyJobDescriptionExtraction", () => {
  it("applies the extracted patch to the active job card", () => {
    const { card, jobId } = applyJobDescriptionExtraction(
      seed(),
      "b1",
      { title: "מלצר/ית", field: "מסעדנות", mustHaves: ["שירות"] },
      "טקסט תיאור משרה",
    );
    assert.equal(card.title, "מלצר/ית");
    assert.equal(card.field, "מסעדנות");
    assert.deepEqual(card.mustHaves, ["שירות"]);
    assert.match(card.narrative, /תיאור משרה שהועלה/);
    assert.ok(jobId);
  });
});
