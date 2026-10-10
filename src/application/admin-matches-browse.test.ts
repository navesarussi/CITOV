import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  listAdminMatches,
  parseSyntheticPairMatchId,
  syntheticPairMatchId,
} from "./admin-matches-browse";
import { createSeedStore } from "@/infrastructure/db/memory-store";

describe("admin-matches-browse", () => {
  it("parses synthetic pair ids", () => {
    const id = syntheticPairMatchId("j1", "c9");
    assert.deepEqual(parseSyntheticPairMatchId(id), { jobId: "j1", candidateId: "c9" });
  });

  it("lists queued matches from store", () => {
    const store = createSeedStore();
    const queued = store.matches.filter((m) => m.status === "queued");
    const { total } = listAdminMatches({
      store,
      filter: "queued",
      page: 1,
      pageSize: 50,
    });
    assert.equal(total, queued.length);
  });
});
