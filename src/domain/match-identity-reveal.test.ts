import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { employerCanViewCandidateIdentity } from "./match-identity-reveal";
import type { Match } from "./types";

function match(partial: Partial<Match>): Match {
  return {
    id: "m1",
    jobOwnerId: "e1",
    jobId: "j1",
    candidateId: "c1",
    score: 0.8,
    reason: "test",
    status: "approved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("match identity reveal", () => {
  it("requires candidate consent after employer approval", () => {
    assert.equal(employerCanViewCandidateIdentity(match({ status: "queued" })), false);
    assert.equal(
      employerCanViewCandidateIdentity(match({ status: "approved", candidateConsentAt: undefined })),
      false,
    );
    assert.equal(
      employerCanViewCandidateIdentity(
        match({ status: "approved", candidateConsentAt: new Date().toISOString() }),
      ),
      true,
    );
  });
});
