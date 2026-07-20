import { generateObject, generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { CandidateCard, ChatMessage, FieldQuestion, JobCard } from "@/domain/types";
import { heuristicEmployeeIntake, heuristicEmployerIntake } from "./heuristic";
import { buildEmployeeConversation, buildEmployerConversation } from "./prompts";
import {
  candidatePatchSchema,
  hasGeminiKey,
  jobPatchSchema,
  type AiTokenUsage,
  type IntakeResult,
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
    });

    const { object, usage } = await generateObject({
      model: model(),
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
