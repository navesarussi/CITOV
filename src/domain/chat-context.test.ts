import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compactCard,
  isSameQuestion,
  selectChatHistory,
  toModelMessages,
  wasQuestionJustAsked,
} from "./chat-context";
import { emptyCandidateCard, type ChatMessage } from "./types";

function msg(role: ChatMessage["role"], content: string, i: number): ChatMessage {
  return { id: String(i), role, content, createdAt: new Date().toISOString() };
}

describe("chat-context", () => {
  it("compacts empty card fields away", () => {
    const card = emptyCandidateCard();
    card.field = "מכירות";
    card.desiredRole = "נציג/ת מכירות";
    const compact = compactCard(card);
    assert.equal(compact.field, "מכירות");
    assert.equal(compact.desiredRole, "נציג/ת מכירות");
    assert.equal(compact.location, undefined);
  });

  it("keeps long chat history (not a single message)", () => {
    const chat = Array.from({ length: 20 }, (_, i) =>
      msg(i % 2 === 0 ? "user" : "assistant", `הודעה ${i}`, i),
    );
    const selected = selectChatHistory(chat);
    assert.ok(selected.length >= 16);
    assert.equal(selected[selected.length - 1].content, "הודעה 19");
  });

  it("builds model messages with full history + new turn", () => {
    const chat = [msg("user", "היי", 0), msg("assistant", "מה מחפש/ת?", 1)];
    const messages = toModelMessages(chat, "מכירות");
    assert.deepEqual(
      messages.map((m) => m.content),
      ["היי", "מה מחפש/ת?", "מכירות"],
    );
  });

  it("detects repeated assistant questions", () => {
    const q = "איזה תפקיד את/ה מחפש/ת עכשיו?";
    assert.equal(isSameQuestion(q, `קיבלתי. ${q}`), true);
    const chat = [msg("assistant", `עדכנתי. הכרטיס מולא ב-2/51 שדות. ${q}`, 0)];
    assert.equal(wasQuestionJustAsked(chat, q), true);
  });
});
