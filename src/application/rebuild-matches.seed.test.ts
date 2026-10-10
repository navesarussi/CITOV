import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rebuildMatches } from "./rebuild-matches";
import { matchingEvalDataset } from "../../eval/matching/dataset";
import { emptyCandidateCard, emptyJobCard, type StoreData } from "@/domain/types";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";

describe("rebuildMatches seed demo", () => {
  it("queues matches for eval seed users (not sandbox-only skip)", () => {
    process.env.MATCHING_MODE = "rule";
    process.env.MATCHING_QUEUE_THRESHOLD = "0.28";
    const emp = matchingEvalDataset.candidates[0]!;
    const job = matchingEvalDataset.jobs[0]!;
    const store: StoreData = {
      users: [],
      employees: [
        {
          userId: "seed-c01",
          card: { ...emptyCandidateCard(), ...emp.card, flexibility: 5 },
          chat: [],
          pendingFieldQuestionIds: [],
        },
      ],
      employers: [
        normalizeEmployerRecord({
          userId: "seed-employer-1",
          card: emptyJobCard(),
          chat: [],
          activeJobId: job.id,
          jobs: [
            {
              id: job.id,
              name: job.card.title,
              card: { ...emptyJobCard(), ...job.card, flexibility: 5 },
              chat: [],
            },
          ],
        }),
      ],
      fieldQuestions: [],
      fieldAnswers: [],
      matches: [],
    };
    const { matches, stats } = rebuildMatches(store);
    assert.ok(stats.newlyQueued > 0, "expected queued pairs for seed users");
    assert.ok(matches.some((m) => m.status === "queued"));
  });
});
