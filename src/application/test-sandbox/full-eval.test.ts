import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSandboxStore } from "../../../eval/test-sandbox/generate-dataset";
import { runSandboxFullEval } from "./full-eval";

describe("runSandboxFullEval", () => {
  it("evaluates all job×candidate pairs", () => {
    process.env.MATCHING_MODE = "rule";
    process.env.MATCHING_QUEUE_THRESHOLD = "0.6";
    const store = buildSandboxStore({ jobCount: 3, candidateCount: 4 });
    const r = runSandboxFullEval(store, undefined);
    assert.equal(r.pairCount, 12);
    assert.ok(r.scoreHistogram.length > 0);
  });
});
