/**
 * Complex CV subtext scenario — simulates Pass A (explicit) + Pass B (inferences)
 * from a résumé whose important traits are mostly implied, then asserts the card
 * receives high/medium signals while low stays pending for chat (policy C).
 *
 * Mapped to SRS: FR-CV-06, FR-CV-08, FR-CV-10
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { candidateMiniCardLines } from "./candidate-mini-card";
import { candidateRows, knowledgePercent } from "./card-progress";
import { isExtractTextUsable, sanitizeCvPatch } from "./cv-sanitize";
import { mergeCvIntoEmployee } from "./cv-merge";
import {
  emptyCandidateCard,
  emptyCvProfile,
  type EmployeeRecord,
  type WorkHistoryEntry,
} from "./types";
import { SUBTEXT_RICH_CV } from "./fixtures/cv-subtext-rich";

export { SUBTEXT_RICH_CV } from "./fixtures/cv-subtext-rich";

function emp(): EmployeeRecord {
  return {
    userId: "noa-demo",
    card: emptyCandidateCard(),
    chat: [],
    pendingFieldQuestionIds: [],
    cv: emptyCvProfile(),
  };
}

const doc = {
  id: "cv-subtext-1",
  kind: "cv" as const,
  fileName: "noa-cohen.pdf",
  mimeType: "application/pdf",
  byteSize: SUBTEXT_RICH_CV.length,
  storageKey: "pg:cv-subtext-1",
  uploadedAt: "2026-07-25T00:00:00.000Z",
  textCharCount: SUBTEXT_RICH_CV.length,
  extractedText: SUBTEXT_RICH_CV,
  extractionStatus: "ok" as const,
};

/** What Pass A should extract from explicit text. */
const passA = {
  patch: {
    desiredRole: "Senior Software Engineer",
    field: "הייטק",
    subField: "Backend / Payments",
    location: "תל אביב",
    experienceYears: 5,
    skills: ["TypeScript", "Node.js", "PostgreSQL", "Redis", "system design"],
    languages: ["עברית", "אנגלית"],
    hebrewLevel: "שפת אם",
    englishLevel: "גבוהה — כתיבה טכנית",
    education: "B.Sc. מדעי המחשב — אוניברסיטת תל אביב",
    linkedinUrl: "linkedin.com/in/noacohen",
    narrative:
      "מהנדסת תוכנה בכירה עם ניסיון במוצרי B2B ותשלומים, רקע בארכיטקטורה ושיפור ביצועים.",
  },
  workHistory: [
    {
      company: "PayFlow Ltd",
      title: "Senior Software Engineer",
      startDate: "2022",
      endDate: undefined,
      isCurrent: true,
      description: "הובלת צוות ושירותי תשלומים ב-low latency",
      achievements: ["שיפור זמני תגובה ב-~40%"],
    },
    {
      company: "RetailOS",
      title: "Software Engineer",
      startDate: "2019",
      endDate: "2022",
      description: "פיתוח למערכות מלאי ומכירות",
    },
  ] satisfies WorkHistoryEntry[],
  educationHistory: [
    {
      institution: "אוניברסיטת תל אביב",
      degreeOrProgram: "B.Sc. מדעי המחשב",
      startDate: "2015",
      endDate: "2019",
    },
  ],
  unmappedFacts: [{ label: "מיקוד מוצר", value: "B2B payments / retail ops" }],
};

/**
 * Pass B subtext — not written as flat fields, but grounded in CV wording.
 * high/medium → card; low → pendingInference only.
 */
const passBInferences = [
  {
    fieldKey: "managementExperience",
    value: "כן",
    evidence: "הובלתי צוות של 6 מפתחים",
    confidence: "high" as const,
  },
  {
    fieldKey: "teamSizeManaged",
    value: "6",
    evidence: "הובלתי צוות של 6 מפתחים",
    confidence: "high" as const,
  },
  {
    fieldKey: "experienceLevel",
    value: "Senior",
    evidence: "Senior Software Engineer + 2019–היום",
    confidence: "high" as const,
  },
  {
    fieldKey: "industryExperience",
    value: "תשלומים / Fintech וקמעונאות",
    evidence: "PayFlow payments + RetailOS inventory",
    confidence: "medium" as const,
  },
  {
    fieldKey: "customerFacingOk",
    value: "חלקי — עבודה מול מוצר ותמיכה",
    evidence: "עבדתי צמוד לצוות מוצר ולתמיכה בשטח",
    confidence: "medium" as const,
  },
  {
    fieldKey: "personality",
    value: "יזומה ומכוונת ביצועים",
    evidence: "הובלתי יוזמות שמקצרות זמני תגובה",
    confidence: "low" as const,
  },
  {
    fieldKey: "workStyle",
    value: "שיתוף פעולה עם מוצר ותמיכה",
    evidence: "עבדתי צמוד לצוות מוצר ולתמיכה בשטח",
    confidence: "low" as const,
  },
];

describe("CV subtext → candidate card (complex scenario)", () => {
  it("accepts the fixture text as usable extract input", () => {
    assert.equal(isExtractTextUsable(SUBTEXT_RICH_CV), true);
    const sanitized = sanitizeCvPatch({
      patch: passA.patch,
      workHistory: passA.workHistory,
      inferences: passBInferences,
    });
    assert.equal(sanitized.strippedCount, 0);
    assert.equal(sanitized.patch.desiredRole, "Senior Software Engineer");
    assert.equal(sanitized.inferences?.length, passBInferences.length);
  });

  it("merges explicit + subtext into the full card; low stays pending", () => {
    const beforeKnowledge = knowledgePercent(candidateRows(emptyCandidateCard()));
    assert.equal(beforeKnowledge, 0);

    const { employee, summary } = mergeCvIntoEmployee(
      emp(),
      {
        patch: passA.patch,
        workHistory: passA.workHistory,
        educationHistory: passA.educationHistory,
        unmappedFacts: passA.unmappedFacts,
        inferences: passBInferences,
        fieldConfidence: {
          desiredRole: "high",
          experienceYears: "medium",
        },
      },
      doc,
      "2026-07-25T12:00:00.000Z",
    );

    const { card, cv } = employee;
    assert.ok(cv);

    // Explicit Pass A on card
    assert.equal(card.desiredRole, "Senior Software Engineer");
    assert.equal(card.location, "תל אביב");
    assert.equal(card.experienceYears, 5);
    assert.ok(card.skills.includes("TypeScript"));
    assert.equal(card.education.includes("מדעי המחשב"), true);

    // Histories projected onto card (FR-CV-08)
    assert.equal(card.workHistory.length, 2);
    assert.equal(card.workHistory[0]?.company, "PayFlow Ltd");
    assert.equal(card.educationHistory.length, 1);
    assert.equal(cv.workHistory.length, 2);

    // High-confidence subtext with valid evidence lands on card
    assert.equal(card.managementExperience, "כן");
    assert.equal(card.teamSizeManaged, "6");
    assert.equal(card.experienceLevel, "Senior");

    // Medium/low subtext must NOT fill card — pending for chat confirmation
    assert.equal(card.industryExperience, "");
    assert.equal(card.customerFacingOk, "");
    assert.equal(card.personality, "");
    assert.equal(card.workStyle, "");
    assert.equal(cv.pendingInferences.length, 4);
    assert.ok(cv.pendingInferences.some((p) => p.fieldKey === "personality"));
    assert.ok(cv.pendingInferences.some((p) => p.fieldKey === "workStyle"));
    assert.ok(cv.pendingInferences.some((p) => p.fieldKey === "industryExperience"));
    assert.ok(cv.pendingInferences.some((p) => p.fieldKey === "customerFacingOk"));

    // Unmapped → extras
    assert.equal(card.extras["מיקוד מוצר"], "B2B payments / retail ops");

    // Evidence recorded for filled inference
    assert.ok(
      cv.fieldEvidence.some(
        (e) => e.fieldKey === "managementExperience" && e.source === "cv" && e.confidence === "high",
      ),
    );

    // Knowledge % rises with filled fields + histories (FR-CV-10)
    const knowledge = knowledgePercent(candidateRows(card));
    assert.ok(knowledge > 30, `expected knowledge > 30, got ${knowledge}`);
    assert.ok(summary.fieldsUpdated >= 8);
    assert.equal(summary.rolesFound, 2);
    assert.equal(summary.educationFound, 1);

    // Reliability penalized for pending confirmations (no contradictions)
    assert.equal(cv.reliability.score, 80); // 100 - 5*4 pending inferences
  });

  it("keeps mini-card free of histories and pending-inference fields", () => {
    const { employee } = mergeCvIntoEmployee(
      emp(),
      {
        patch: passA.patch,
        workHistory: passA.workHistory,
        educationHistory: passA.educationHistory,
        inferences: passBInferences,
      },
      doc,
    );
    const lines = candidateMiniCardLines(employee.card, {
      desiredRole: "תפקיד",
      field: "תחום",
      location: "מיקום",
      experienceYears: "ניסיון",
      experienceLevel: "רמה",
      skills: "כישורים",
      education: "השכלה",
      workHistory: "היסטוריה",
      managementExperience: "ניהול",
      personality: "אופי",
    });
    const keys = lines.map((l) => l.key);
    assert.ok(keys.includes("desiredRole"));
    assert.ok(keys.includes("experienceLevel")); // high inference — on mini allowlist
    assert.ok(!keys.includes("workHistory"));
    assert.ok(!keys.includes("managementExperience")); // not in MINI_KEYS
    assert.ok(!keys.includes("personality")); // empty + not filled from low
  });
});
