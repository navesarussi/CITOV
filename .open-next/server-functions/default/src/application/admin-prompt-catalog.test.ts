import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { samplePreviewForPrompt, runPromptEval } from "./admin-prompt-catalog";

describe("admin-prompt-catalog", () => {
  it("renders chat preview with sample placeholders", () => {
    const out = samplePreviewForPrompt("candidate_chat", "שלום {{known_facts}}");
    assert.match(out, /מלצר/);
    assert.doesNotMatch(out, /\{\{known_facts\}\}/);
  });

  it("runs eval summary for supported prompts", () => {
    const r = runPromptEval("candidate_chat");
    assert.ok(r.labeledPairs >= 0);
    assert.ok(r.noteHe.length > 10);
  });
});
