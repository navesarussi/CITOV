import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyCandidateCard } from "@/domain/types";
import { translateCandidateCardForDisplay } from "./translate-candidate-display";

describe("translateCandidateCardForDisplay", () => {
  it("no-ops when card language matches locale", async () => {
    const card = {
      ...emptyCandidateCard(),
      summary: "מהנדס תוכנה עם ניסיון בפיתוח מערכות ווב מודרניות בישראל.",
      desiredRole: "מהנדס תוכנה",
    };
    const next = await translateCandidateCardForDisplay(card, "he");
    assert.equal(next.summary, card.summary);
    assert.equal(next.desiredRole, card.desiredRole);
  });
});
