import { generateObject, generateText, streamText } from "ai";
import {
  callGeminiWithRetry,
  getGeminiModel,
  hasGeminiKey,
} from "./gemini-client";
import { z } from "zod";
import type { CandidateCard, ChatMessage, FieldQuestion, JobCard } from "@/domain/types";
import { normalizeAssistantReplyText } from "@/domain/chat-reply";
import { heuristicEmployeeIntake, heuristicEmployerIntake, heuristicCvWelcomeReply } from "./heuristic";
import { buildEmployeeConversation, buildEmployerConversation, cvWelcomeSystemNote } from "./prompts";
import {
  candidatePatchSchema,
  jobExtractionSchema,
  jobPatchSchema,
  type AiTokenUsage,
  type CandidatePatch,
  type IntakeResult,
  type JobPatch,
} from "./schemas";
import { extractGeminiUsage } from "./usage-extract";
import { isAiBudgetBlocked } from "@/application/ai-budget-gate";
import { resolvePromptText } from "@/infrastructure/db/prompt-versions";
import { renderPromptTemplate } from "@/domain/admin";

export { runCvExtraction } from "./cv-extraction";

function extractUsage(usage?: Parameters<typeof extractGeminiUsage>[0]): AiTokenUsage | undefined {
  return extractGeminiUsage(usage);
}

export async function runEmployeeIntake(params: {
  message: string;
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
  systemPrompt: string;
  pendingConflicts?: string;
  pendingInferences?: string;
  openReliabilityNotes?: string;
  locale?: "he" | "en";
  accountHolderFirstName?: string;
}): Promise<IntakeResult> {
  if (!hasGeminiKey() || (await isAiBudgetBlocked())) {
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
      pendingInferences: params.pendingInferences,
      openReliabilityNotes: params.openReliabilityNotes,
      locale: params.locale,
      accountHolderFirstName: params.accountHolderFirstName,
    });

    const { object, usage } = await callGeminiWithRetry(() =>
      generateObject({
        model: getGeminiModel(),
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
      }),
    );

    return {
      reply: object.reply,
      candidatePatch: object.patch,
      fieldAnswers: object.fieldAnswers,
      provider: "gemini",
      usage: extractUsage(usage),
      degraded: false,
    };
  } catch (err) {
    console.error("employee intake Gemini failed, using heuristic", err);
    const fallback = heuristicEmployeeIntake(
      params.message,
      params.card,
      params.pendingQuestions,
      params.chat,
    );
    return { ...fallback, provider: "heuristic", degraded: true };
  }
}

export async function runEmployerIntake(params: {
  message: string;
  card: JobCard;
  chat: ChatMessage[];
  systemPrompt: string;
  pendingJobConfirmations?: string;
}): Promise<IntakeResult> {
  if (!hasGeminiKey() || (await isAiBudgetBlocked())) {
    return heuristicEmployerIntake(params.message, params.card, params.chat);
  }

  try {
    const { system, messages } = buildEmployerConversation({
      template: params.systemPrompt,
      message: params.message,
      card: params.card,
      chat: params.chat,
      pendingConfirmations: params.pendingJobConfirmations,
    });

    const { object, usage } = await callGeminiWithRetry(() =>
      generateObject({
        model: getGeminiModel(),
        temperature: 0.65,
        schema: z.object({
          reply: z.string(),
          patch: jobPatchSchema,
        }),
        system,
        messages,
      }),
    );

    return {
      reply: object.reply,
      jobPatch: object.patch,
      provider: "gemini",
      usage: extractUsage(usage),
      degraded: false,
    };
  } catch (err) {
    console.error("employer intake Gemini failed, using heuristic", err);
    const fallback = heuristicEmployerIntake(params.message, params.card, params.chat);
    return { ...fallback, provider: "heuristic", degraded: true };
  }
}


const EXTRACTION_ONLY_NOTE =
  "\n\n(משימה זו: החזר/י אך ורק חילוץ נתונים מובנה לכרטיס מתוך ההודעה האחרונה. אל תנסח/י תשובת שיחה בשדה כלשהו.)";

const REPLY_ONLY_NOTE =
  "\n\n(בתשובה זו: החזר/י אך ורק טקסט שיחה טבעי בעברית למועמד/ת — בלי JSON, בלי patch, בלי fieldAnswers.)";

/** Stream ONLY the conversational reply (no schema → clean token stream). */
export async function streamEmployeeReply(params: {
  message: string;
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
  systemPrompt: string;
  pendingConflicts?: string;
  pendingInferences?: string;
  openReliabilityNotes?: string;
  locale?: "he" | "en";
  accountHolderFirstName?: string;
}): Promise<{ textStream: AsyncIterable<string>; usage: Promise<AiTokenUsage | undefined> } | null> {
  if (!hasGeminiKey() || (await isAiBudgetBlocked())) return null;
  const { system, messages } = buildEmployeeConversation({
    template: params.systemPrompt,
    message: params.message,
    card: params.card,
    chat: params.chat,
    pendingQuestions: params.pendingQuestions,
    pendingConflicts: params.pendingConflicts,
    pendingInferences: params.pendingInferences,
    openReliabilityNotes: params.openReliabilityNotes,
    locale: params.locale,
    accountHolderFirstName: params.accountHolderFirstName,
  });
  const result = streamText({
    model: getGeminiModel(),
    temperature: 0.7,
    system: system + REPLY_ONLY_NOTE,
    messages,
  });
  const usage = Promise.resolve(result.usage)
    .then((u) => extractUsage(u))
    .catch(() => undefined);
  return { textStream: result.textStream, usage };
}

export async function streamEmployerReply(params: {
  message: string;
  card: JobCard;
  chat: ChatMessage[];
  systemPrompt: string;
  pendingJobConfirmations?: string;
}): Promise<{ textStream: AsyncIterable<string>; usage: Promise<AiTokenUsage | undefined> } | null> {
  if (!hasGeminiKey() || (await isAiBudgetBlocked())) return null;
  const { system, messages } = buildEmployerConversation({
    template: params.systemPrompt,
    message: params.message,
    card: params.card,
    chat: params.chat,
    pendingConfirmations: params.pendingJobConfirmations,
  });
  const result = streamText({
    model: getGeminiModel(),
    temperature: 0.7,
    system: system + REPLY_ONLY_NOTE,
    messages,
  });
  const usage = Promise.resolve(result.usage)
    .then((u) => extractUsage(u))
    .catch(() => undefined);
  return { textStream: result.textStream, usage };
}

export async function runCvWelcomeReply(params: {
  userCvMessage: string;
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
  systemPrompt: string;
  pendingConflicts?: string;
  pendingInferences?: string;
  openReliabilityNotes?: string;
  isCvUpdate: boolean;
  locale: "he" | "en";
  accountHolderFirstName?: string;
  candidateSubjectFirstName?: string;
}): Promise<{ reply: string; provider: string; usage?: AiTokenUsage; degraded?: boolean }> {
  const welcomeNote = cvWelcomeSystemNote({
    isCvUpdate: params.isCvUpdate,
    locale: params.locale,
    accountHolderFirstName: params.accountHolderFirstName,
    candidateSubjectFirstName: params.candidateSubjectFirstName,
  });
  const systemPrompt = params.systemPrompt + welcomeNote;

  if (!hasGeminiKey() || (await isAiBudgetBlocked())) {
    return {
      reply: heuristicCvWelcomeReply({
        card: params.card,
        chat: params.chat,
        pendingQuestions: params.pendingQuestions,
        isCvUpdate: params.isCvUpdate,
        locale: params.locale,
        candidateSubjectFirstName: params.candidateSubjectFirstName,
        accountHolderFirstName: params.accountHolderFirstName,
      }),
      provider: "heuristic",
    };
  }

  try {
    const { system, messages } = buildEmployeeConversation({
      template: systemPrompt,
      message: params.userCvMessage,
      card: params.card,
      chat: params.chat,
      pendingQuestions: params.pendingQuestions,
      pendingConflicts: params.pendingConflicts,
      pendingInferences: params.pendingInferences,
      openReliabilityNotes: params.openReliabilityNotes,
      locale: params.locale,
      accountHolderFirstName: params.accountHolderFirstName,
    });
    const { text, usage } = await callGeminiWithRetry(() =>
      generateText({
        model: getGeminiModel(),
        temperature: 0.7,
        system: system + REPLY_ONLY_NOTE,
        messages,
      }),
    );
    const reply = normalizeAssistantReplyText(text);
    if (!reply) throw new Error("empty cv welcome reply");
    return {
      reply,
      provider: "gemini",
      usage: extractUsage(usage),
      degraded: false,
    };
  } catch (err) {
    console.error("cv welcome Gemini failed, using heuristic", err);
    return {
      reply: heuristicCvWelcomeReply({
        card: params.card,
        chat: params.chat,
        pendingQuestions: params.pendingQuestions,
        isCvUpdate: params.isCvUpdate,
        locale: params.locale,
        candidateSubjectFirstName: params.candidateSubjectFirstName,
        accountHolderFirstName: params.accountHolderFirstName,
      }),
      provider: "heuristic",
      degraded: true,
    };
  }
}

export async function extractEmployeePatch(params: {
  message: string;
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
  systemPrompt: string;
  pendingConflicts?: string;
  pendingInferences?: string;
  openReliabilityNotes?: string;
  locale?: "he" | "en";
  accountHolderFirstName?: string;
}): Promise<{
  candidatePatch: CandidatePatch;
  fieldAnswers: { questionId: string; answer: string }[];
  usage?: AiTokenUsage;
}> {
  if (!hasGeminiKey() || (await isAiBudgetBlocked())) {
    return { candidatePatch: {}, fieldAnswers: [] };
  }
  try {
    const { system, messages } = buildEmployeeConversation({
      template: params.systemPrompt,
      message: params.message,
      card: params.card,
      chat: params.chat,
      pendingQuestions: params.pendingQuestions,
      pendingConflicts: params.pendingConflicts,
      pendingInferences: params.pendingInferences,
      openReliabilityNotes: params.openReliabilityNotes,
      locale: params.locale,
      accountHolderFirstName: params.accountHolderFirstName,
    });
    const { object, usage } = await callGeminiWithRetry(() =>
      generateObject({
        model: getGeminiModel(),
        temperature: 0.25,
        schema: z.object({
          patch: candidatePatchSchema,
          fieldAnswers: z
            .array(z.object({ questionId: z.string(), answer: z.string() }))
            .default([]),
        }),
        system: system + EXTRACTION_ONLY_NOTE,
        messages,
      }),
    );
    return {
      candidatePatch: object.patch,
      fieldAnswers: object.fieldAnswers,
      usage: extractUsage(usage),
    };
  } catch (err) {
    console.error("employee patch extraction failed, using heuristic", err);
    const h = heuristicEmployeeIntake(
      params.message,
      params.card,
      params.pendingQuestions,
      params.chat,
    );
    return { candidatePatch: h.candidatePatch ?? {}, fieldAnswers: h.fieldAnswers ?? [] };
  }
}

export async function extractEmployerPatch(params: {
  message: string;
  card: JobCard;
  chat: ChatMessage[];
  systemPrompt: string;
  pendingJobConfirmations?: string;
}): Promise<{ jobPatch: JobPatch; usage?: AiTokenUsage }> {
  if (!hasGeminiKey() || (await isAiBudgetBlocked())) {
    return { jobPatch: {} };
  }
  try {
    const { system, messages } = buildEmployerConversation({
      template: params.systemPrompt,
      message: params.message,
      card: params.card,
      chat: params.chat,
      pendingConfirmations: params.pendingJobConfirmations,
    });
    const { object, usage } = await callGeminiWithRetry(() =>
      generateObject({
        model: getGeminiModel(),
        temperature: 0.25,
        schema: z.object({ patch: jobPatchSchema }),
        system: system + EXTRACTION_ONLY_NOTE,
        messages,
      }),
    );
    return { jobPatch: object.patch, usage: extractUsage(usage) };
  } catch (err) {
    console.error("employer patch extraction failed, using heuristic", err);
    const h = heuristicEmployerIntake(params.message, params.card, params.chat);
    return { jobPatch: h.jobPatch ?? {} };
  }
}

export type CardExtraction<P> = {
  patch: P;
  provider: "gemini" | "heuristic";
  usage?: AiTokenUsage;
};

const JOB_EXTRACTION_SYSTEM_LEGACY = `את/ה עוזר/ת השמה שמחלץ/ת מידע מתיאור משרה אל כרטיס משרה.
- חלץ/י אך ורק מה שמופיע במפורש בטקסט. אל תמציא/י ואל תנחש/י.
- ערכים תמציתיים. שדה שלא מופיע בטקסט — אל תכלול/י אותו ב-patch.
- העדף/י למלא: title, field, location, mustHaves, niceToHaves, requiredLanguages, salaryRange, workModel, seniorityLevel, personalityFit, teamCulture.
- סכם/י את המשרה והתרבות בשדה narrative.
החזר/י JSON עם השדה patch בלבד.`;

/** Extract job card fields from a raw job-description document. */
export type JobDescriptionExtractionResult = CardExtraction<JobPatch> & {
  extractedFields?: import("@/domain/extraction-evidence").ExtractedField[];
  pendingConfirmations?: import("@/domain/extraction-evidence").ExtractedField[];
};

export async function runJobDescriptionExtraction(params: {
  text: string;
  card: JobCard;
}): Promise<JobDescriptionExtractionResult> {
  if (!hasGeminiKey() || (await isAiBudgetBlocked())) {
    const h = heuristicEmployerIntake(params.text, params.card, []);
    return { patch: h.jobPatch ?? {}, provider: "heuristic" };
  }
  try {
    const system =
      (await resolvePromptText("job_card_extraction")) || JOB_EXTRACTION_SYSTEM_LEGACY;
    const { object, usage } = await callGeminiWithRetry(() =>
      generateObject({
        model: getGeminiModel(),
        temperature: 0.2,
        schema: jobExtractionSchema,
        system,
        messages: [
          {
            role: "user",
            content: `תיאור משרה:\n\n${params.text}\n\nכרטיס נוכחי (למניעת דריסה מיותרת):\n${JSON.stringify(params.card)}`,
          },
        ],
      }),
    );
    return {
      patch: object.patch,
      extractedFields: object.extractedFields,
      provider: "gemini",
      usage: extractUsage(usage),
    };
  } catch (err) {
    console.error("job extraction Gemini failed, using heuristic", err);
    const h = heuristicEmployerIntake(params.text, params.card, []);
    return { patch: h.jobPatch ?? {}, provider: "heuristic" };
  }
}

/** Not wired in match rebuild (cost/latency per pair). Use rule-based explainMatch unless product enables. */
export async function enrichReasonWithAi(
  reason: string,
  candidateSummary: string,
  jobSummary: string,
): Promise<{ text: string; usage?: AiTokenUsage }> {
  if (!hasGeminiKey() || (await isAiBudgetBlocked())) return { text: reason };
  try {
    const template =
      (await resolvePromptText("match_reason_enrich")) ||
      `נסח במשפט אחד בעברית, אנושי ובלי כותרות, למה המועמד והמשרה מתאימים.
מועמד: {{candidateSummary}}
משרה: {{jobSummary}}
בסיס: {{reason}}`;
    const prompt = renderPromptTemplate(template, {
      candidateSummary,
      jobSummary,
      reason,
    });
    const { text, usage } = await callGeminiWithRetry(() =>
      generateText({
        model: getGeminiModel(),
        prompt,
      }),
    );
    return { text: text.trim() || reason, usage: extractUsage(usage) };
  } catch {
    return { text: reason };
  }
}
