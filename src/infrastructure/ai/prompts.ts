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

const CONTEXT_HINT_HE = "(מופיע בהודעת הקשר הראשונה ב־messages)";
const CONTEXT_HINT_EN = "(see the first context message in messages)";

function contextHint(locale: "he" | "en" | undefined): string {
  return locale === "en" ? CONTEXT_HINT_EN : CONTEXT_HINT_HE;
}

/** Static system prefix — identical across turns for Gemini implicit context caching. */
function renderStaticSystem(template: string, locale: "he" | "en" | undefined): string {
  const hint = contextHint(locale);
  return renderPromptTemplate(template, {
    chat_history: hint,
    new_message: hint,
    current_card: hint,
    known_facts: hint,
    missing_field_key: hint,
    pending_field_questions: hint,
    recent_agent_questions: hint,
  });
}

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

function buildEmployeeDynamicContext(params: {
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
  pendingConflicts?: string;
  pendingInferences?: string;
  openReliabilityNotes?: string;
  locale?: "he" | "en";
}): string {
  const locale = params.locale ?? "he";
  const pending = params.pendingQuestions
    .map((q) => `- [${q.id}] ${q.question}`)
    .join("\n");
  const missing = nextMissingCandidateField(params.card);
  const recent = recentAssistantReplies(params.chat)
    .map((q) => `- ${q}`)
    .join("\n");
  const header =
    locale === "en"
      ? "## Session context (updates each turn)\n"
      : "## הקשר נוכחי (מתעדכן בכל תור)\n";
  const lines = [
    header,
    locale === "en" ? "### Known facts\n" : "### ידוע על המועמד/ת\n",
    knownFactsText(params.card),
    locale === "en" ? "\n### Card snapshot (JSON)\n" : "\n### צילום כרטיס (JSON)\n",
    JSON.stringify(compactCard(params.card), null, 2),
    locale === "en" ? "\n### Next missing field\n" : "\n### שדה חסר הבא\n",
    missing ? `${missing.label} (${missing.key})` : locale === "en" ? "none" : "אין",
    locale === "en" ? "\n### Pending domain questions\n" : "\n### שאלות תחום ממתינות\n",
    pending || (locale === "en" ? "none" : "אין"),
    locale === "en" ? "\n### Your recent questions\n" : "\n### שאלות שכבר שאלת\n",
    recent || (locale === "en" ? "none yet" : "אין עדיין"),
  ];
  const conflicts = params.pendingConflicts?.trim();
  const inferences = params.pendingInferences?.trim();
  const notes = params.openReliabilityNotes?.trim();
  if (conflicts) {
    lines.push(
      locale === "en"
        ? "\n### CV vs chat conflicts\n"
        : "\n### קונפליקטים (קו״ח מול שיחה)\n",
      conflicts,
    );
  }
  if (inferences) {
    lines.push(
      locale === "en" ? "\n### Weak CV inferences\n" : "\n### הסקות חלשות מהקו״ח\n",
      inferences,
    );
  }
  if (notes) {
    lines.push(
      locale === "en" ? "\n### Open reliability notes\n" : "\n### סתירות פתוחות\n",
      notes,
    );
  }
  return lines.join("\n");
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

function buildEmployerDynamicContext(params: {
  card: JobCard;
  chat: ChatMessage[];
  locale?: "he" | "en";
}): string {
  const locale = params.locale ?? "he";
  const missing = nextMissingJobField(params.card);
  const recent = recentAssistantReplies(params.chat)
    .map((q) => `- ${q}`)
    .join("\n");
  const header =
    locale === "en"
      ? "## Session context (updates each turn)\n"
      : "## הקשר נוכחי (מתעדכן בכל תור)\n";
  return [
    header,
    locale === "en" ? "### Known facts\n" : "### ידוע על המשרה\n",
    knownFactsText(params.card),
    locale === "en" ? "\n### Job card (JSON)\n" : "\n### צילום כרטיס משרה (JSON)\n",
    JSON.stringify(compactCard(params.card), null, 2),
    locale === "en" ? "\n### Next missing field\n" : "\n### שדה חסר הבא\n",
    missing ? `${missing.label} (${missing.key})` : locale === "en" ? "none" : "אין",
    locale === "en" ? "\n### Your recent questions\n" : "\n### שאלות שכבר שאלת\n",
    recent || (locale === "en" ? "none yet" : "אין עדיין"),
  ].join("\n");
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
  const locale = params.locale ?? "he";
  const dynamicContext = buildEmployeeDynamicContext(params);
  const staticSystem =
    renderStaticSystem(params.template, locale) +
    agentIdentitySystemBlock(locale) +
    (params.accountHolderFirstName
      ? `\n\n[${locale === "en" ? "Account holder (not your name)" : "בעל/ת החשבון (לא שמך)"}: ${params.accountHolderFirstName}]`
      : "");

  return {
    system: staticSystem,
    messages: [
      { role: "user", content: dynamicContext },
      ...toModelMessages(params.chat, params.message),
    ],
  };
}

export function buildEmployerConversation(params: {
  template: string;
  message: string;
  card: JobCard;
  chat: ChatMessage[];
  locale?: "he" | "en";
}): BuiltConversation {
  const locale = params.locale ?? "he";
  const dynamicContext = buildEmployerDynamicContext({ ...params, locale });
  return {
    system: renderStaticSystem(params.template, locale),
    messages: [
      { role: "user", content: dynamicContext },
      ...toModelMessages(params.chat, params.message),
    ],
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
