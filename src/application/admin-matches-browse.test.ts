import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  listAdminMatches,
  parseSyntheticPairMatchId,
  syntheticPairMatchId,
} from "./admin-matches-browse";
import { rebuildMatches } from "@/application/rebuild-matches";
import { createSeedStore } from "@/infrastructure/db/memory-store";

describe("admin-matches-browse", () => {
  it("parses synthetic pair ids", () => {
    const id = syntheticPairMatchId("j1", "c9");
    assert.deepEqual(parseSyntheticPairMatchId(id), { jobId: "j1", candidateId: "c9" });
  });

  it("lists queued matches from store (includes demo-seed pairs)", () => {
    const store = createSeedStore();
    const now = new Date().toISOString();
    store.matches = [
      {
        id: "pair__demo-job__demo-employee",
        jobOwnerId: "demo-employer",
        jobId: "demo-employer",
        candidateId: "demo-employee",
        score: 0.72,
        reason: "בדיקה · hybrid",
        status: "queued",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const { total } = listAdminMatches({
      store,
      filter: "queued",
      page: 1,
      pageSize: 50,
    });
    assert.equal(total, 1);
  });
});
