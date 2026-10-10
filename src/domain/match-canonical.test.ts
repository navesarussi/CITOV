import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  candidateForMatching,
  canonicalizeRoleToken,
  inferMatchCanonicalFromText,
} from "./match-canonical";
import { emptyCandidateCard } from "./types";

describe("match-canonical", () => {
  it("maps Hebrew waiter to English token", () => {
    assert.equal(canonicalizeRoleToken("מלצר"), "waiter");
  });

  it("uses canonical role in rule matching view", () => {
    const card = {
      ...emptyCandidateCard(),
      desiredRole: "מלצר",
      matchCanonical: inferMatchCanonicalFromText({ desiredRole: "מלצר" }),
    };
    const view = candidateForMatching(card);
    assert.equal(view.desiredRole, "waiter");
  });
});
