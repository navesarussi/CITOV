/**
 * Live Gemini CV extraction against the rich-subtext fixture.
 * Loads `.env.local` when present (same key as production: GOOGLE_GENERATIVE_AI_API_KEY).
 *
 * Run: npm run test:cv-live
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadEnvLocal } from "../test/load-env-local";
import { hasGeminiKey } from "./gemini-client";
import { runCvExtraction } from "./cv-extraction";
import { mergeCvIntoEmployee } from "@/domain/cv-merge";
import { SUBTEXT_RICH_CV } from "@/domain/fixtures/cv-subtext-rich";
import {
  emptyCandidateCard,
  emptyCvProfile,
  type EmployeeRecord,
} from "@/domain/types";

loadEnvLocal();
const live = Boolean(process.env.DATABASE_URL?.trim()) && hasGeminiKey();

describe("live CV extraction (Gemini)", { skip: !live ? "needs DATABASE_URL and GOOGLE_GENERATIVE_AI_API_KEY" : false }, () => {
  it("extracts leadership subtext onto the candidate card", { timeout: 120_000 }, async () => {
    const extracted = await runCvExtraction({
      text: SUBTEXT_RICH_CV,
      card: emptyCandidateCard(),
    });

    assert.notEqual(
      extracted.provider,
      "heuristic",
      "Gemini failed and fell back to heuristic — check maxOutputTokens / API errors",
    );
    assert.equal(extracted.failed, undefined);
    assert.equal(extracted.provider, "gemini");
    assert.ok(
      (extracted.workHistory?.length ?? 0) >= 1 ||
        Boolean(extracted.patch.desiredRole) ||
        (extracted.inferences?.length ?? 0) >= 1,
      "expected structured roles and/or inferences from CV",
    );

    const emp: EmployeeRecord = {
      userId: "live-noa",
      card: emptyCandidateCard(),
      chat: [],
      pendingFieldQuestionIds: [],
      cv: emptyCvProfile(),
    };
    const doc = {
      id: "live-doc",
      kind: "cv" as const,
      fileName: "noa.pdf",
      mimeType: "application/pdf",
      byteSize: 1,
      storageKey: "x",
      uploadedAt: new Date().toISOString(),
      textCharCount: SUBTEXT_RICH_CV.length,
      extractedText: SUBTEXT_RICH_CV,
      extractionStatus: "ok" as const,
    };

    const { employee } = mergeCvIntoEmployee(
      emp,
      {
        patch: extracted.patch,
        workHistory: extracted.workHistory,
        educationHistory: extracted.educationHistory,
        unmappedFacts: extracted.unmappedFacts,
        fieldConfidence: extracted.fieldConfidence,
        inferences: extracted.inferences,
      },
      doc,
    );

    const card = employee.card;
    // Soft assertions: at least one leadership / seniority signal on card or pending
    const leadershipOnCard =
      Boolean(card.managementExperience?.trim()) ||
      Boolean(card.teamSizeManaged?.trim()) ||
      /senior|בכיר/i.test(card.experienceLevel) ||
      /senior/i.test(card.desiredRole);

    const leadershipPending = (employee.cv?.pendingInferences ?? []).some((p) =>
      /management|teamSize|experienceLevel|personality|leadership/i.test(p.fieldKey),
    );

    assert.ok(
      leadershipOnCard || leadershipPending || (card.workHistory?.length ?? 0) >= 1,
      `expected leadership/seniority signal; card=${JSON.stringify({
        desiredRole: card.desiredRole,
        managementExperience: card.managementExperience,
        teamSizeManaged: card.teamSizeManaged,
        experienceLevel: card.experienceLevel,
        workHistory: card.workHistory?.length,
        inferences: extracted.inferences,
      })}`,
    );

    // Remove eslint comment - not needed
    console.log(
      "live extraction summary",
      JSON.stringify(
        {
          desiredRole: card.desiredRole,
          managementExperience: card.managementExperience,
          teamSizeManaged: card.teamSizeManaged,
          experienceLevel: card.experienceLevel,
          industryExperience: card.industryExperience,
          workHistory: card.workHistory?.length,
          pendingInferences: employee.cv?.pendingInferences?.map((p) => p.fieldKey),
          inferenceCount: extracted.inferences?.length ?? 0,
        },
        null,
        2,
      ),
    );
  });
});
