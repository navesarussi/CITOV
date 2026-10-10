import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runExtractionEval } from "./extraction-eval";

describe("extraction-eval", () => {
  it("returns before/after metrics on golden set", () => {
    const r = runExtractionEval();
    assert.ok(r.cases >= 25);
    assert.ok(r.baselineHallucinationRate >= r.hallucinationRate);
    assert.ok(r.precision >= r.baselinePrecision - 0.01);
  });
});
