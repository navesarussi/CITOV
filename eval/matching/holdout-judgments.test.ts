import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { holdoutJudgmentByPair, holdoutJudgmentCount } from "./load-holdout-judgments";

describe("holdout judgment fixture", () => {
  it("loads 60 frozen suggestions", () => {
    assert.equal(holdoutJudgmentCount(), 60);
    const j = holdoutJudgmentByPair("j01", "c11");
    assert.ok(j);
    assert.ok(j!.judgeA.reasonHe.length > 5);
  });
});
