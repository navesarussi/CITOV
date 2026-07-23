import { generateObject, generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { CandidateCard, ChatMessage, FieldQuestion, JobCard } from "@/domain/types";
import { heuristicEmployeeIntake, heuristicEmployerIntake } from "./heuristic";
import { buildEmployeeConversation, buildEmployerConversation } from "./prompts";
import {
  candidatePatchSchema,
  cvExtractionSchema,
  hasGeminiKey,
  jobPatchSchema,
  type AiTokenUsage,
  type CandidatePatch,
  type IntakeResult,
  type JobPatch,
} from "./schemas";

let cachedModel: ReturnType<ReturnType<typeof createGoogleGenerativeAI>> | null = null;

function model() {
  if (cachedModel) return cachedModel;
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  cachedModel = google("gemini-2.5-flash");
  return cachedModel;
}

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

export async function runEmployeeIntake(params: {
  message: string;
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
  systemPrompt: string;
  pendingConflicts?: string;
}): Promise<IntakeResult> {
  if (!hasGeminiKey()) {
    return heuristicEmployeeIntake(
      params.message,
      params.card,
      params.pendingQuestions,
      params.chat,
    );
  }

  try {
    const { system, messages } = buildEmployeeConversation({
      template: params.systemPrompt,
      message: params.message,
      card: params.card,
      chat: params.chat,
      pendingQuestions: params.pendingQuestions,
      pendingConflicts: params.pendingConflicts,
    });

    const { object, usage } = await generateObject({
      model: model(),
      temperature: 0.65,
      schema: z.object({
        reply: z.string(),
        patch: candidatePatchSchema,
        fieldAnswers: z
          .array(z.object({ questionId: z.string(), answer: z.string() }))
          .default([]),
      }),
      system,
      messages,
    });

    return {
      reply: object.reply,
      candidatePatch: object.patch,
      fieldAnswers: object.fieldAnswers,
      provider: "gemini",
      usage: extractUsage(usage),
    };
  } catch (err) {
    console.error("employee intake Gemini failed, using heuristic", err);
    return heuristicEmployeeIntake(
      params.message,
      params.card,
      params.pendingQuestions,
      params.chat,
    );
  }
}

export async function runEmployerIntake(params: {
  message: string;
  card: JobCard;
  chat: ChatMessage[];
  systemPrompt: string;
}): Promise<IntakeResult> {
  if (!hasGeminiKey()) {
    return heuristicEmployerIntake(params.message, params.card, params.chat);
  }

  try {
    const { system, messages } = buildEmployerConversation({
      template: params.systemPrompt,
      message: params.message,
      card: params.card,
      chat: params.chat,
    });

    const { object, usage } = await generateObject({
      model: model(),
      temperature: 0.65,
      schema: z.object({
        reply: z.string(),
        patch: jobPatchSchema,
      }),
      system,
      messages,
    });

    return {
      reply: object.reply,
      jobPatch: object.patch,
      provider: "gemini",
      usage: extractUsage(usage),
    };
  } catch (err) {
    console.error("employer intake Gemini failed, using heuristic", err);
    return heuristicEmployerIntake(params.message, params.card, params.chat);
  }
}

export type CardExtraction<P> = {
  patch: P;
  provider: "gemini" | "heuristic";
  usage?: AiTokenUsage;
};

const CV_EXTRACTION_SYSTEM = `את/ה מגייס/ת מקצועית שמנתחת קורות חיים לעומק ומדייקת לכרטיס מועמד/ת.
כללים מחייבים:
1. חלץ/י אך ורק מידע שמופיע במפורש בטקסט. אל תמציא/י, אל תנחש/י, אל תשלימ/י פערי ניסיון.
2. מלא/י כמה שיותר שדות רלוונטיים ב-patch (תפקיד, תחום, מיקום, כישורים, שפות, השכלה, הסמכות, רישיונות, ניסיון, קישורים וכו').
3. בנה/י workHistory מלאה לכל תפקיד (חברה, תפקיד, תאריכים אם יש, תיאור/הישגים).
4. בנה/י educationHistory לכל מוסד/תואר/קורס משמעותי.
5. כל פרט מפורש שלא נכנס לשדה קבוע — העבר/י ל-unmappedFacts (label+value). אסור לאבד מידע.
6. narrative = סיכום מקצועי קצר של הרקע בלבד (לא העתקת כל הקורות חיים).
7. fieldConfidence: סמן/י high/medium/low לשדות עמומים.
8. שדה שלא מופיע — אל תכלול/י אותו ב-patch.
החזר/י JSON לפי הסכמה בלבד.`;

/** Extract candidate card fields + histories from raw CV / résumé text. */
export async function runCvExtraction(params: {
  text: string;
  card: CandidateCard;
}): Promise<
  CardExtraction<CandidatePatch> & {
    workHistory?: import("@/domain/types").WorkHistoryEntry[];
    educationHistory?: import("@/domain/types").EducationHistoryEntry[];
    unmappedFacts?: import("@/domain/types").UnmappedFact[];
    fieldConfidence?: Record<string, "high" | "medium" | "low">;
  }
> {
  if (!hasGeminiKey()) {
    const h = heuristicEmployeeIntake(params.text, params.card, [], []);
    return { patch: h.candidatePatch ?? {}, provider: "heuristic" };
  }
  try {
    const { object, usage } = await generateObject({
      model: model(),
      temperature: 0.15,
      schema: cvExtractionSchema,
      system: CV_EXTRACTION_SYSTEM,
      messages: [
        {
          role: "user",
          content: `קורות חיים לניתוח מעמיק:\n\n${params.text}\n\nכרטיס נוכחי (למודעות בלבד; מיזוג יטופל בשרת):\n${JSON.stringify(params.card)}`,
        },
      ],
    });
    return {
      patch: object.patch,
      workHistory: object.workHistory,
      educationHistory: object.educationHistory,
      unmappedFacts: object.unmappedFacts,
      fieldConfidence: object.fieldConfidence,
      provider: "gemini",
      usage: extractUsage(usage),
    };
  } catch (err) {
    console.error("cv extraction Gemini failed, using heuristic", err);
    const h = heuristicEmployeeIntake(params.text, params.card, [], []);
    return { patch: h.candidatePatch ?? {}, provider: "heuristic" };
  }
}

const JOB_EXTRACTION_SYSTEM = `את/ה עוזר/ת השמה שמחלץ/ת מידע מתיאור משרה אל כרטיס משרה.
- חלץ/י אך ורק מה שמופיע במפורש בטקסט. אל תמציא/י ואל תנחש/י.
- ערכים תמציתיים. שדה שלא מופיע בטקסט — אל תכלול/י אותו ב-patch.
- העדף/י למלא: title, field, location, mustHaves, niceToHaves, requiredLanguages, salaryRange, workModel, seniorityLevel, personalityFit, teamCulture.
- סכם/י את המשרה והתרבות בשדה narrative.
החזר/י JSON עם השדה patch בלבד.`;

/** Extract job card fields from a raw job-description document. */
export async function runJobDescriptionExtraction(params: {
  text: string;
  card: JobCard;
}): Promise<CardExtraction<JobPatch>> {
  if (!hasGeminiKey()) {
    const h = heuristicEmployerIntake(params.text, params.card, []);
    return { patch: h.jobPatch ?? {}, provider: "heuristic" };
  }
  try {
    const { object, usage } = await generateObject({
      model: model(),
      temperature: 0.2,
      schema: z.object({ patch: jobPatchSchema }),
      system: JOB_EXTRACTION_SYSTEM,
      messages: [
        {
          role: "user",
          content: `תיאור משרה:\n\n${params.text}\n\nכרטיס נוכחי (למניעת דריסה מיותרת):\n${JSON.stringify(params.card)}`,
        },
      ],
    });
    return { patch: object.patch, provider: "gemini", usage: extractUsage(usage) };
  } catch (err) {
    console.error("job extraction Gemini failed, using heuristic", err);
    const h = heuristicEmployerIntake(params.text, params.card, []);
    return { patch: h.jobPatch ?? {}, provider: "heuristic" };
  }
}

export async function enrichReasonWithAi(
  reason: string,
  candidateSummary: string,
  jobSummary: string,
): Promise<{ text: string; usage?: AiTokenUsage }> {
  if (!hasGeminiKey()) return { text: reason };
  try {
    const { text, usage } = await generateText({
      model: model(),
      prompt: `נסח במשפט אחד בעברית, אנושי ובלי כותרות, למה המועמד והמשרה מתאימים.
מועמד: ${candidateSummary}
משרה: ${jobSummary}
בסיס: ${reason}`,
    });
    return { text: text.trim() || reason, usage: extractUsage(usage) };
  } catch {
    return { text: reason };
  }
}
