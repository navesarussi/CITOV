import type { CandidateCard, ChatMessage, JobCard } from "@/domain/types";

const MAX_HISTORY_MESSAGES = 32;
const MAX_HISTORY_CHARS = 10_000;

/** Keep recent turns; never send only the latest message in isolation. */
export function selectChatHistory(chat: ChatMessage[]): ChatMessage[] {
  const recent = chat.slice(-MAX_HISTORY_MESSAGES);
  let total = 0;
  const kept: ChatMessage[] = [];
  for (let i = recent.length - 1; i >= 0; i--) {
    const len = recent[i].content.length + 8;
    if (kept.length > 0 && total + len > MAX_HISTORY_CHARS) break;
    kept.unshift(recent[i]);
    total += len;
  }
  return kept;
}

/** Non-empty card fields only — smaller prompts, faster model turns. */
export function compactCard(card: CandidateCard | JobCard): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(card)) {
    if (value == null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (key === "extras" && value && typeof value === "object" && !Object.keys(value).length) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function knownFactsText(card: CandidateCard | JobCard): string {
  const compact = compactCard(card);
  const lines = Object.entries(compact).map(([k, v]) => {
    const val = Array.isArray(v) ? v.join(", ") : String(v);
    return `- ${k}: ${val}`;
  });
  return lines.length ? lines.join("\n") : "עדיין אין פרטים ידועים.";
}

export function recentAssistantReplies(chat: ChatMessage[], limit = 4): string[] {
  return chat
    .filter((m) => m.role === "assistant")
    .slice(-limit)
    .map((m) => m.content.trim())
    .filter(Boolean);
}

/** Normalize for repeat detection (strip fill-count leftovers, punctuation). */
export function normalizeQuestion(text: string): string {
  return text
    .replace(/הכרטיס מולא ב-\d+\/\d+ שדות\.?/g, "")
    .replace(/כרטיס המשרה מולא ב-\d+\/\d+ שדות\.?/g, "")
    .replace(/עדכנתי \d+ פרטים\.?/g, "")
    .replace(/[?.!\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isSameQuestion(a: string, b: string): boolean {
  const na = normalizeQuestion(a);
  const nb = normalizeQuestion(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

export function wasQuestionJustAsked(chat: ChatMessage[], candidateQuestion: string): boolean {
  const last = [...chat].reverse().find((m) => m.role === "assistant");
  if (!last) return false;
  return isSameQuestion(last.content, candidateQuestion);
}

export type ModelChatMessage = { role: "user" | "assistant"; content: string };

export function toModelMessages(
  chat: ChatMessage[],
  newMessage: string,
): ModelChatMessage[] {
  const history = selectChatHistory(chat).map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
  }));
  return [...history, { role: "user", content: newMessage }];
}
