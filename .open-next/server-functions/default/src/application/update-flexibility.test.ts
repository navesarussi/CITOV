import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyCandidateCard, emptyJobCard, type StoreData } from "@/domain/types";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import { applyFlexibility, updateFlexibility } from "./update-flexibility";
import type { MatchEmbeddingIndex } from "./match-scoring";

function seed(): StoreData {
  const employer = normalizeEmployerRecord({
    userId: "boss",
    card: emptyJobCard(),
    chat: [],
    jobs: [
      {
        id: "job-1",
        card: {
          ...emptyJobCard(),
          title: "מלצר",
          field: "מסעדנות",
          location: "תל אביב",
          mustHaves: ["שירות"],
        },
        chat: [],
      },
    ],
    activeJobId: "job-1",
  });
  const now = new Date().toISOString();
  return {
    users: [{ id: "cand", name: "Cand", role: "employee", createdAt: now }],
    employees: [
      {
        userId: "cand",
        card: {
          ...emptyCandidateCard(),
          desiredRole: "מלצר",
          field: "מסעדנות",
          location: "תל אביב",
          skills: ["שירות"],
          flexibility: 5,
        },
        chat: [],
        pendingFieldQuestionIds: [],
      },
    ],
    employers: [employer],
    fieldQuestions: [],
    fieldAnswers: [],
    matches: [],
  };
}

describe("updateFlexibility", () => {
  it("changes match set when flexibility changes", () => {
    process.env.MATCHING_MODE = "rule";
    process.env.MATCHING_QUEUE_THRESHOLD = "0.28";
    const next = updateFlexibility(seed(), "cand", 8);
    assert.ok(next.matches.some((m) => m.status === "queued"));
  });

  it("uses embedding index when provided (hybrid path)", () => {
    process.env.MATCHING_MODE = "hybrid";
    process.env.MATCHING_QUEUE_THRESHOLD = "0.28";
    const fakeVec = { role: [1, 0], skills: [1, 0], profile: [1, 0] };
    const index: MatchEmbeddingIndex = {
      candidate: new Map([["cand", fakeVec]]),
      job: new Map([["job-1", fakeVec]]),
    };
    const base = applyFlexibility(seed(), "cand", 5).store;
    const ruleOnly = updateFlexibility(base, "cand", 5);
    const withEmb = updateFlexibility(base, "cand", 5, index);
    const ruleMode = ruleOnly.matches[0]?.scoreBreakdown?.effectiveMode;
    const hybridMode = withEmb.matches[0]?.scoreBreakdown?.effectiveMode;
    assert.equal(ruleMode, "rule");
    assert.equal(hybridMode, "hybrid");
  });
});
