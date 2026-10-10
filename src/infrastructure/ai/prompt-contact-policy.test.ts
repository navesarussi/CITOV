import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkChatPromptContactPolicy } from "./prompt-contact-policy";

describe("prompt contact policy", () => {
  it("employer and candidate file prompts do not request contact details", () => {
    const violations = checkChatPromptContactPolicy();
    assert.deepEqual(
      violations,
      [],
      violations.map((v) => `${v.prompt}:${v.patternId} (${v.excerpt})`).join("; "),
    );
  });
});
