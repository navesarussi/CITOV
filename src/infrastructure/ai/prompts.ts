import { readFileSync } from "fs";
import { join } from "path";
import { renderPromptTemplate } from "@/domain/admin";
import {
  compactCard,
  knownFactsText,
  recentAssistantReplies,
  toModelMessages,
  type ModelChatMessage,
} from "@/domain/chat-context";
import {
  nextMissingCandidateField,
  nextMissingJobField,
} from "@/domain/card-progress";
import { agentIdentitySystemBlock } from "@/domain/agent-identity";
import {
  PROMPT_BUNDLE_VERSION,
  type AdminSettings,
  type CandidateCard,
  type ChatMessage,
  type FieldQuestion,
  type JobCard,
} from "@/domain/types";

let cachedCandidatePrompt: string | null = null;
let cachedEmployerPrompt: string | null = null;

function readPromptFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

export function clearDefaultPromptCache(): void {
  cachedCandidatePrompt = null;
  cachedEmployerPrompt = null;
}

export function getDefaultCandidatePrompt(): string {
  if (!cachedCandidatePrompt) {
    cachedCandidatePrompt = readPromptFile("prompts/candidate/system-prompt.md");
  }
  return cachedCandidatePrompt;
}

export function getDefaultEmployerPrompt(): string {
  if (!cachedEmployerPrompt) {
    cachedEmployerPrompt = readPromptFile("prompts/employer/system-prompt.md");
  }
  return cachedEmployerPrompt;
}

export function resolveAdminSettings(
  raw?: Partial<AdminSettings>,
): AdminSettings {
  const hasStoredPrompts =
    Boolean(raw?.candidatePrompt?.trim()) && Boolean(raw?.employerPrompt?.trim());
  const version = raw?.promptBundleVersion;
  const customFresh =
    hasStoredPrompts &&
    (version === PROMPT_BUNDLE_VERSION || version == null);

  if (customFresh) {
    return {
      candidatePrompt: raw!.candidatePrompt!.trim(),
      employerPrompt: raw!.employerPrompt!.trim(),
      updatedAt: raw?.updatedAt,
      updatedBy: raw?.updatedBy,
      promptBundleVersion: raw?.promptBundleVersion,
    };
  }

  // Stale / missing admin override → ship the latest file prompts.
  return {
    candidatePrompt: getDefaultCandidatePrompt(),
    employerPrompt: getDefaultEmployerPrompt(),
    updatedAt: raw?.updatedAt,
    updatedBy: raw?.updatedBy,
    promptBundleVersion: PROMPT_BUNDLE_VERSION,
  };
}

export function hasCustomAdminPrompts(raw?: Partial<AdminSettings>): boolean {
  const hasStoredPrompts =
    Boolean(raw?.candidatePrompt?.trim()) && Boolean(raw?.employerPrompt?.trim());
  const version = raw?.promptBundleVersion;
  return (
    hasStoredPrompts &&
    (version === PROMPT_BUNDLE_VERSION || version == null)
  );
}

export type BuiltConversation = {
  system: string;
  messages: ModelChatMessage[];
};

function renderSystem(template: string, vars: Record<string, string>): string {
  return renderPromptTemplate(template, {
    chat_history: "(ההיסטוריה מגיעה כהודעות נפרדות — ראה/י messages)",
    new_message: "(ההודעה האחרונה היא ההודעה האחרונה ב-messages)",
    current_card: vars.current_card,
    known_facts: vars.known_facts,
    missing_field_key: vars.missing_field_key,
    pending_field_questions: vars.pending_field_questions,
    recent_agent_questions: vars.recent_agent_questions,
  });
}

export function cvWelcomeSystemNote(params: {
  isCvUpdate: boolean;
  locale: "he" | "en";
  /** Job seeker name from CV (who you address). */
  candidateSubjectFirstName?: string;
  accountHolderFirstName?: string;
}): string {
  const subject = params.candidateSubjectFirstName?.trim();
  const account = params.accountHolderFirstName?.trim();
  if (params.locale === "en") {
    return params.isCvUpdate
      ? `\n\n[System: CV update event. You are CITOV's agent — never say "I am ${account ?? "the uploader"}". Address the candidate${subject ? ` as ${subject}` : ""}. Open with "I received your updated CV", one strength, one follow-up question.]`
      : `\n\n[System: First CV upload. You are CITOV's agent — never use the uploader's name as your identity. Address the candidate${subject ? ` as ${subject}` : ""}. Say you received their CV, one strength, one question.]`;
  }
  return params.isCvUpdate
    ? `\n\n[אירוע: קו"ח מעודכנים. את/ה סוכן/ת CITOV — אל תגיד/י "אני ${account ?? "…"}"${account ? ` (זה שם בעל/ת החשבון ${account}, לא שלך)` : ""}. פנה/י למועמד/ת${subject ? ` בשם ${subject}` : ""}. "קיבלתי את קורות החיים המעודכנים שלך", חוזק אחד, שאלה אחת.]`
    : `\n\n[אירוע: קו"ח ראשון. את/ה סוכן/ת CITOV — לעולם אל תציג/י את עצמך בשם ${account ?? "בעל/ת החשבון"}. פנה/י למועמד/ת${subject ? ` בשם ${subject}` : ""}. "קיבלתי את קורות החיים שלך", חוזק, שאלה.]`;
}

export function buildEmployeeConversation(params: {
  template: string;
  message: string;
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
  pendingConflicts?: string;
  pendingInferences?: string;
  openReliabilityNotes?: string;
  locale?: "he" | "en";
  accountHolderFirstName?: string;
}): BuiltConversation {
  const pending = params.pendingQuestions
    .map((q) => `- [${q.id}] ${q.question}`)
    .join("\n");
  const missing = nextMissingCandidateField(params.card);
  const recent = recentAssistantReplies(params.chat)
    .map((q) => `- ${q}`)
    .join("\n");
  const conflicts = params.pendingConflicts?.trim();
  const inferences = params.pendingInferences?.trim();
  const notes = params.openReliabilityNotes?.trim();
  const conflictBlock = conflicts
    ? `\n\nקונפליקטים ממקורות שונים (CV מול שיחה) — ברר/י בעדינות מה מעודכן, בלי למחוק מקורות:\n${conflicts}`
    : "";
  const inferenceBlock = inferences
    ? `\n\nהסקות חלשות מהקו״ח לאישור (אל תציין שמדובר ב״הסקה״ או ציון):\n${inferences}`
    : "";
  const notesBlock = notes
    ? `\n\nסתירות פתוחות לבירור (בלי להזכיר אמינות/ציונים):\n${notes}`
    : "";

  return {
    system:
      renderSystem(params.template, {
        current_card: JSON.stringify(compactCard(params.card), null, 2),
        known_facts: knownFactsText(params.card),
        missing_field_key: missing ? `${missing.label} (${missing.key})` : "",
        pending_field_questions: pending || "אין",
        recent_agent_questions: recent || "אין עדיין",
      }) +
      conflictBlock +
      inferenceBlock +
      notesBlock +
      agentIdentitySystemBlock(params.locale ?? "he") +
      (params.accountHolderFirstName
        ? `\n\n[הקשר: בעל/ת החשבון המחובר/ת: ${params.accountHolderFirstName}. זה לא שמך ולא בהכרח שם המועמד/ת.]`
        : ""),
    messages: toModelMessages(params.chat, params.message),
  };
}

export function buildEmployerConversation(params: {
  template: string;
  message: string;
  card: JobCard;
  chat: ChatMessage[];
}): BuiltConversation {
  const missing = nextMissingJobField(params.card);
  const recent = recentAssistantReplies(params.chat)
    .map((q) => `- ${q}`)
    .join("\n");

  return {
    system: renderSystem(params.template, {
      current_card: JSON.stringify(compactCard(params.card), null, 2),
      known_facts: knownFactsText(params.card),
      missing_field_key: missing ? `${missing.label} (${missing.key})` : "",
      pending_field_questions: "אין",
      recent_agent_questions: recent || "אין עדיין",
    }),
    messages: toModelMessages(params.chat, params.message),
  };
}

export function buildEmployeePrompt(params: {
  template: string;
  message: string;
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
}): string {
  const built = buildEmployeeConversation(params);
  return `${built.system}\n\n---\n${built.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
}

export function buildEmployerPrompt(params: {
  template: string;
  message: string;
  card: JobCard;
  chat: ChatMessage[];
}): string {
  const built = buildEmployerConversation(params);
  return `${built.system}\n\n---\n${built.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
}
