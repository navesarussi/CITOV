import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calibrateCosineSimilarity } from "./matching-calibration";

describe("matching-calibration", () => {
  it("maps cosine at floor to 0 and at 1 to 1", () => {
    assert.equal(calibrateCosineSimilarity(0.75, 0.75), 0);
    assert.equal(calibrateCosineSimilarity(1, 0.75), 1);
    assert.ok(Math.abs(calibrateCosineSimilarity(0.875, 0.75) - 0.5) < 1e-9);
  });
});
