import { generateObject } from "ai";
import {
  callGeminiWithRetry,
  getGeminiModel,
  hasGeminiKey,
} from "./gemini-client";
import type { CandidateCard } from "@/domain/types";
import { compactCard } from "@/domain/chat-context";
import { isExtractTextUsable, sanitizeCvPatch } from "@/domain/cv-sanitize";
import { heuristicEmployeeIntake } from "./heuristic";
import {
  cvExtractionSchema,
  cvInferencePassSchema,
  type AiTokenUsage,
  type CandidatePatch,
} from "./schemas";

/** Without caps Gemini can hit finishReason=length (~65k tokens) and fail structured parse. */
const PASS_A_MAX_TOKENS = 4096;
const PASS_B_MAX_TOKENS = 2048;
const MAX_CV_CHARS = 14_000;

function extractUsage(usage?: {
  promptTokens?: number;
  completionTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}): AiTokenUsage | undefined {
  if (!usage) return undefined;
  const promptTokens = usage.promptTokens ?? usage.inputTokens ?? 0;
  const completionTokens = usage.completionTokens ?? usage.outputTokens ?? 0;
  if (promptTokens === 0 && completionTokens === 0) return undefined;
  return {
    promptTokens,
    completionTokens,
    totalTokens: usage.totalTokens ?? promptTokens + completionTokens,
  };
}

function clipCvText(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_CV_CHARS) return t;
  return `${t.slice(0, MAX_CV_CHARS)}\n\n[…טקסט קו״ח קוצר לניתוח…]`;
}

const PASS_A_SYSTEM = `את/ה מגייס/ת מקצועית שמחלצת מקורות חיים עובדות מפורשות בלבד אל כרטיס מועמד/ת.
כללים מחייבים:
1. חלץ/י אך ורק מידע שמופיע במפורש בטקסט. אל תמציא/י, אל תנחש/י.
2. מלא/י רק שדות שיש להם ערך אמיתי בטקסט. שדה ריק = אל תכלול/י אותו ב-patch.
3. ערכים קצרים ותמציתיים (מילים בודדות עד משפט קצר). אסור טקסט חוזר / מילוי מלאכותי.
4. workHistory: רשומה לכל תפקיד (חברה, תפקיד, תאריכים אם יש, description קצר עד ~2 משפטים).
5. educationHistory: מוסד/תואר משמעותי בלבד.
6. unmappedFacts: רק פרטים מפורשים שלא נכנסו לשדה קבוע (label+value קצרים).
7. narrative: עד 3 משפטים מקצועיים — לא להעתיק את כל הקו״ח.
8. fieldConfidence רק לשדות עמומים.
החזר/י JSON קצר לפי הסכמה. אל תכלול inferences. אל תמלא שדות סתם.`;

const PASS_B_SYSTEM = `את/ה אנליסט/ית השמה. הפק/י הסקות סאבטקסט מבוקרות בלבד.
כללים:
1. כל פריט: fieldKey + value קצר + evidence (ציטוט קצר) + confidence high|medium|low.
2. מותר: ניהול מ"הובלתי צוות", בכירות מתואר/שנים, תחום מתפקידים, סגנון מניסוח.
3. אסור להמציא מעסיקים/תאריכים/שכר/מיקום. מקסימום 12 הסקות. אם אין — מערך ריק.
4. fieldKey משדות כרטיס מוכרים (managementExperience, teamSizeManaged, experienceLevel, industryExperience, personality, workStyle, customerFacingOk).
החזר/י JSON עם inferences בלבד — קצר.`;

export type CvExtractionResult = {
  patch: CandidatePatch;
  workHistory?: import("@/domain/types").WorkHistoryEntry[];
  educationHistory?: import("@/domain/types").EducationHistoryEntry[];
  unmappedFacts?: import("@/domain/types").UnmappedFact[];
  fieldConfidence?: Record<string, "high" | "medium" | "low">;
  inferences?: {
    fieldKey: string;
    value: string;
    evidence: string;
    confidence: "high" | "medium" | "low";
  }[];
  provider: "gemini" | "heuristic";
  usage?: AiTokenUsage;
  failed?: boolean;
  strippedCount?: number;
};

/** Two-pass CV extraction: structured facts then controlled subtext. */
export async function runCvExtraction(params: {
  text: string;
  card: CandidateCard;
}): Promise<CvExtractionResult> {
  if (!isExtractTextUsable(params.text)) {
    return { patch: {}, provider: "heuristic", failed: true };
  }

  if (!hasGeminiKey()) {
    const h = heuristicEmployeeIntake(params.text, params.card, [], []);
    const sanitized = sanitizeCvPatch({ patch: h.candidatePatch ?? {} });
    return {
      patch: sanitized.patch as CandidatePatch,
      provider: "heuristic",
      strippedCount: sanitized.strippedCount,
    };
  }

  try {
    const cvText = clipCvText(params.text);
    const cardHint = compactCard(params.card);
    const passA = await callGeminiWithRetry(() =>
      generateObject({
        model: getGeminiModel(),
        temperature: 0.1,
        maxOutputTokens: PASS_A_MAX_TOKENS,
        schema: cvExtractionSchema,
        system: PASS_A_SYSTEM,
        messages: [
          {
            role: "user",
            content: `קורות חיים לניתוח (עובדות מפורשות בלבד):\n\n${cvText}\n\nכרטיס נוכחי (לא ריק בלבד):\n${JSON.stringify(cardHint)}`,
          },
        ],
      }),
    );

    let inferences: CvExtractionResult["inferences"] = [];
    let usageB: AiTokenUsage | undefined;
    try {
      const passB = await callGeminiWithRetry(() =>
        generateObject({
          model: getGeminiModel(),
          temperature: 0.2,
          maxOutputTokens: PASS_B_MAX_TOKENS,
          schema: cvInferencePassSchema,
          system: PASS_B_SYSTEM,
          messages: [
            {
              role: "user",
              content: `טקסט קורות חיים:\n\n${cvText}\n\nחילוץ מובנה קיים:\n${JSON.stringify({
                patch: passA.object.patch,
                workHistory: passA.object.workHistory,
                educationHistory: passA.object.educationHistory,
              })}`,
            },
          ],
        }),
      );
      inferences = (passB.object.inferences ?? []).slice(0, 12);
      usageB = extractUsage(passB.usage);
    } catch (err) {
      console.error("cv subtext pass B failed; keeping pass A only", err);
    }

    const usageA = extractUsage(passA.usage);
    const usage =
      usageA || usageB
        ? {
            promptTokens: (usageA?.promptTokens ?? 0) + (usageB?.promptTokens ?? 0),
            completionTokens:
              (usageA?.completionTokens ?? 0) + (usageB?.completionTokens ?? 0),
            totalTokens: (usageA?.totalTokens ?? 0) + (usageB?.totalTokens ?? 0),
          }
        : undefined;

    const sanitized = sanitizeCvPatch({
      patch: passA.object.patch ?? {},
      workHistory: passA.object.workHistory,
      educationHistory: passA.object.educationHistory,
      unmappedFacts: passA.object.unmappedFacts,
      fieldConfidence: passA.object.fieldConfidence,
      inferences,
    });

    return {
      patch: sanitized.patch as CandidatePatch,
      workHistory: sanitized.workHistory as CvExtractionResult["workHistory"],
      educationHistory: sanitized.educationHistory as CvExtractionResult["educationHistory"],
      unmappedFacts: sanitized.unmappedFacts,
      fieldConfidence: sanitized.fieldConfidence,
      inferences: sanitized.inferences,
      provider: "gemini",
      usage,
      strippedCount: sanitized.strippedCount,
    };
  } catch (err) {
    console.error("cv extraction Gemini failed, using heuristic", err);
    const h = heuristicEmployeeIntake(params.text, params.card, [], []);
    const sanitized = sanitizeCvPatch({ patch: h.candidatePatch ?? {} });
    return {
      patch: sanitized.patch as CandidatePatch,
      provider: "heuristic",
      strippedCount: sanitized.strippedCount,
    };
  }
}
