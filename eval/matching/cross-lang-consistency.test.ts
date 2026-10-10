import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CROSS_LANG_PAIRS } from "./cross-lang-dataset";
import { runCrossLangConsistencyEval } from "./cross-lang-eval";

describe("cross-language matching consistency", () => {
  it("20 pairs × en/he/mixed stay within score tolerance and queue decision", () => {
    assert.equal(CROSS_LANG_PAIRS.length, 20);
    const report = runCrossLangConsistencyEval();
    assert.ok(
      report.overallPassRate >= 1,
      report.failures.slice(0, 8).join("\n") || `pass rate ${report.overallPassRate}`,
    );
  });
});
