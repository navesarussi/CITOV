import { readFileSync } from "fs";
import { join } from "path";
import { renderPromptTemplate } from "@/domain/admin";
import {
  candidateRows,
  jobRows,
  nextMissingCandidateField,
  nextMissingJobField,
} from "@/domain/card-progress";
import type { AdminSettings, CandidateCard, ChatMessage, FieldQuestion, JobCard } from "@/domain/types";

function readPromptFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

export function getDefaultCandidatePrompt(): string {
  return readPromptFile("prompts/candidate/system-prompt.md");
}

export function getDefaultEmployerPrompt(): string {
  return readPromptFile("prompts/employer/system-prompt.md");
}

export function resolveAdminSettings(
  raw?: Partial<AdminSettings>,
): AdminSettings {
  return {
    candidatePrompt: raw?.candidatePrompt?.trim() || getDefaultCandidatePrompt(),
    employerPrompt: raw?.employerPrompt?.trim() || getDefaultEmployerPrompt(),
    updatedAt: raw?.updatedAt,
    updatedBy: raw?.updatedBy,
  };
}

function historyText(chat: ChatMessage[]): string {
  return chat
    .slice(-16)
    .map((m) => `${m.role === "user" ? "משתמש" : "סוכן"}: ${m.content}`)
    .join("\n");
}

export function buildEmployeePrompt(params: {
  template: string;
  message: string;
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
}): string {
  const pending = params.pendingQuestions
    .map((q) => `- [${q.id}] ${q.question}`)
    .join("\n");
  const missing = nextMissingCandidateField(params.card);

  return renderPromptTemplate(params.template, {
    new_message: params.message,
    chat_history: historyText(params.chat),
    current_card: JSON.stringify(params.card, null, 2),
    missing_field_key: missing ? `${missing.label} (${missing.key})` : "",
    pending_field_questions: pending || "אין",
  });
}

export function buildEmployerPrompt(params: {
  template: string;
  message: string;
  card: JobCard;
  chat: ChatMessage[];
}): string {
  const missing = nextMissingJobField(params.card);

  return renderPromptTemplate(params.template, {
    new_message: params.message,
    chat_history: historyText(params.chat),
    current_card: JSON.stringify(params.card, null, 2),
    missing_field_key: missing ? `${missing.label} (${missing.key})` : "",
    pending_field_questions: "",
  });
}
