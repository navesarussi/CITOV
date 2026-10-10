import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createOtherPersonProfile,
  ensureProfilePack,
  listCandidateProfiles,
  pickAuthoritativeChat,
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

  it("prefers DB chat when profile pack slot is stale/empty", () => {
    const dbChat = [
      { id: "1", role: "user" as const, content: "a", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "2", role: "assistant" as const, content: "b", createdAt: "2026-01-01T00:00:01.000Z" },
    ];
    const emp = ensureProfilePack({
      userId: "u1",
      card: emptyCandidateCard(),
      chat: dbChat,
      pendingFieldQuestionIds: [],
      cv: {
        documents: [{ id: "d1" } as never],
        profilePack: {
          activeProfileId: "self",
          profiles: [
            {
              id: "self",
              label: "אני",
              kind: "self",
              card: emptyCandidateCard(),
              chat: [],
              pendingFieldQuestionIds: [],
            },
          ],
        },
      } as never,
    });
    assert.equal(emp.chat.length, 2);
    assert.equal(pickAuthoritativeChat(dbChat, []).length, 2);
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
