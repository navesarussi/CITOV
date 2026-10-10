import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CROSS_LANG_HOLDOUT_PAIRS } from "./cross-lang-holdout-dataset";
import { runCrossLangConsistencyEval } from "./cross-lang-eval";

/** Frozen holdout — informational pass rate only (no alias tuning). */
export const CROSS_LANG_HOLDOUT_LAST_PASS_RATE: { value: number } = { value: -1 };

describe("cross-language holdout (frozen)", () => {
  it("15 pairs × en/he/mixed — report pass rate without gating training thresholds", () => {
    assert.equal(CROSS_LANG_HOLDOUT_PAIRS.length, 15);
    const report = runCrossLangConsistencyEval(undefined, CROSS_LANG_HOLDOUT_PAIRS);
    CROSS_LANG_HOLDOUT_LAST_PASS_RATE.value = report.overallPassRate;
    // Honest overfitting check: log failures; do not assert 100% (holdout is not alias-tuned).
    if (report.failures.length) {
      console.info(
        `[holdout] pass ${(report.overallPassRate * 100).toFixed(0)}% — sample failures:\n${report.failures.slice(0, 6).join("\n")}`,
      );
    } else {
      console.info(`[holdout] pass ${(report.overallPassRate * 100).toFixed(0)}%`);
    }
    assert.ok(report.overallPassRate >= 0 && report.overallPassRate <= 1);
  });
});
