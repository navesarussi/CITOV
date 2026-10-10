import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createOtherPersonProfile,
  ensureProfilePack,
  listCandidateProfiles,
  switchActiveProfile,
} from "./candidate-profiles";
import { emptyCandidateCard } from "./types";

describe("candidate-profiles", () => {
  it("creates default self profile", () => {
    const emp = ensureProfilePack({
      userId: "u1",
      card: { ...emptyCandidateCard(), desiredRole: "מלצר" },
      chat: [],
      pendingFieldQuestionIds: [],
    });
    assert.equal(listCandidateProfiles(emp).length, 1);
    assert.equal(listCandidateProfiles(emp)[0]?.kind, "self");
  });

  it("supports multiple profiles and switch", () => {
    let emp = ensureProfilePack({
      userId: "u1",
      card: { ...emptyCandidateCard(), desiredRole: "self" },
      chat: [],
      pendingFieldQuestionIds: [],
    });
    emp = createOtherPersonProfile(
      emp,
      "Nave Sarussi",
      { ...emptyCandidateCard(), desiredRole: "Developer" },
    );
    assert.equal(listCandidateProfiles(emp).length, 2);
    assert.equal(emp.card.desiredRole, "Developer");
    const selfId = listCandidateProfiles(emp).find((p) => p.kind === "self")!.id;
    emp = switchActiveProfile(emp, selfId);
    assert.equal(emp.card.desiredRole, "self");
  });
});
