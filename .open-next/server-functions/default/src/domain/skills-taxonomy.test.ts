import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalizeSkillList,
  canonicalizeSkillToken,
  skillTokensForOverlap,
} from "./skills-taxonomy";

describe("skills-taxonomy", () => {
  it("maps Hebrew JS alias to javascript", () => {
    assert.equal(canonicalizeSkillToken("ג'אווה סקריפט"), "javascript");
    assert.equal(canonicalizeSkillToken("JS"), "javascript");
  });

  it("expands overlap tokens with family", () => {
    const tokens = skillTokensForOverlap(["React"]);
    assert.ok(tokens.includes("react"));
    assert.ok(tokens.includes("frontend"));
  });

  it("dedupes canonical skill list", () => {
    const list = canonicalizeSkillList(["JS", "JavaScript", "react"]);
    assert.deepEqual(list, ["javascript", "react"]);
  });
});
