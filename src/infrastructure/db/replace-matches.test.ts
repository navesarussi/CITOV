import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyProductionQueuedMatchReplace } from "./normalized-store";
import type { Match } from "@/domain/types";

function m(partial: Partial<Match> & Pick<Match, "id" | "status">): Match {
  return {
    jobOwnerId: "boss",
    jobId: "job-1",
    candidateId: "cand",
    score: partial.score ?? 80,
    reason: "test",
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    isTest: partial.isTest ?? false,
    ...partial,
  };
}

describe("applyProductionQueuedMatchReplace", () => {
  it("retains sandbox and decided rows; replaces production queued only", () => {
    const existing = [
      m({ id: "sandbox-q", status: "queued", isTest: true, score: 50 }),
      m({ id: "prod-approved", status: "approved", score: 90 }),
      m({ id: "prod-old-q", status: "queued", score: 70 }),
    ];
    const rebuilt = [
      m({ id: "prod-approved", status: "approved", score: 90 }),
      m({ id: "prod-new-q", status: "queued", score: 85 }),
    ];
    const next = applyProductionQueuedMatchReplace(existing, rebuilt);
    assert.deepEqual(
      next.map((x) => x.id).sort(),
      ["prod-approved", "prod-new-q", "sandbox-q"].sort(),
    );
    assert.ok(!next.some((x) => x.id === "prod-old-q"));
  });
});
