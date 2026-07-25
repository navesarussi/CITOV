/**
 * Application-level pipeline: applyCvExtraction with Pass A+B payload
 * for the rich-subtext CV fixture.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCvExtraction } from "./chat";
import { knowledgePercent, candidateRows } from "@/domain/card-progress";
import { SUBTEXT_RICH_CV } from "@/domain/fixtures/cv-subtext-rich";
import {
  emptyCandidateCard,
  emptyCvProfile,
  type StoreData,
} from "@/domain/types";

function seed(): StoreData {
  return {
    users: [{ id: "noa-demo", name: "נועה", role: "employee", createdAt: "" }],
    employees: [
      {
        userId: "noa-demo",
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
  };
}

const doc = {
  id: "cv-subtext-app",
  kind: "cv" as const,
  fileName: "noa.pdf",
  mimeType: "application/pdf",
  byteSize: SUBTEXT_RICH_CV.length,
  storageKey: "pg:x",
  uploadedAt: "2026-07-25T00:00:00.000Z",
  textCharCount: SUBTEXT_RICH_CV.length,
  extractedText: SUBTEXT_RICH_CV,
  extractionStatus: "ok" as const,
};

describe("applyCvExtraction subtext pipeline", () => {
  it("fills candidate card from explicit + high/medium inferences", () => {
    const { store, card, summary } = applyCvExtraction(
      seed(),
      "noa-demo",
      {
        patch: {
          desiredRole: "Senior Software Engineer",
          field: "הייטק",
          location: "תל אביב",
          experienceYears: 5,
          skills: ["TypeScript", "Node.js"],
          narrative: "מהנדסת תוכנה בכירה במוצרי B2B ותשלומים.",
        },
        workHistory: [
          {
            company: "PayFlow Ltd",
            title: "Senior Software Engineer",
            startDate: "2022",
            isCurrent: true,
            description: "הובלתי צוות של 6 מפתחים",
          },
        ],
        educationHistory: [
          {
            institution: "אוניברסיטת תל אביב",
            degreeOrProgram: "B.Sc. מדעי המחשב",
          },
        ],
        inferences: [
          {
            fieldKey: "managementExperience",
            value: "כן",
            evidence: "הובלתי צוות של 6 מפתחים",
            confidence: "high",
          },
          {
            fieldKey: "teamSizeManaged",
            value: "6",
            evidence: "הובלתי צוות של 6 מפתחים",
            confidence: "high",
          },
          {
            fieldKey: "personality",
            value: "יזומה",
            evidence: "הובלתי יוזמות",
            confidence: "low",
          },
        ],
      },
      doc,
    );

    assert.equal(card.desiredRole, "Senior Software Engineer");
    assert.equal(card.managementExperience, "כן");
    assert.equal(card.teamSizeManaged, "6");
    assert.equal(card.personality, "");
    assert.equal(card.workHistory.length, 1);
    assert.ok(summary.fieldsUpdated >= 4);

    const emp = store.employees.find((e) => e.userId === "noa-demo")!;
    assert.equal(emp.cv?.pendingInferences.length, 1);
    assert.ok(knowledgePercent(candidateRows(card)) > 15);
    assert.ok(SUBTEXT_RICH_CV.includes("הובלתי צוות של 6"));
  });
});
