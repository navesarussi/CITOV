import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStableMatchId, stableMatchId } from "./match-id";

describe("stableMatchId", () => {
  it("round-trips job and candidate ids", () => {
    const id = stableMatchId("j01", "c47");
    assert.equal(id, "pair__j01__c47");
    assert.deepEqual(parseStableMatchId(id), { jobId: "j01", candidateId: "c47" });
  });
});
