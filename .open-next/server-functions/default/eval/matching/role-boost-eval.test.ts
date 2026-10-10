import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultRuleBasedMatcher,
  evaluateMatcherOnDataset,
} from "../../src/domain/matching-eval/evaluate";
import { matchingEvalDataset } from "./dataset";
import { buildHoldoutEvalDataset } from "./load-holdout-labels";
import { createEvalMatcherDefinitions } from "./eval-matchers";
import { loadEvalEmbeddingFixture } from "./load-embed-fixture";

/**
 * Role-boost lifts hybrid scores when semantic role aligns but rule title match is weak.
 * Keep enabled only if holdout bad_queued does not increase vs disabled.
 */
describe("role-boost A/B on labeled sets", () => {
  it("reports train/holdout bad_queued with role boost on vs off", () => {
    const fixture = loadEvalEmbeddingFixture();
    if (!fixture) {
      console.log("skip role-boost A/B — no embedding fixture");
      return;
    }
    const hybrid = createEvalMatcherDefinitions(fixture).find(
      (m) => m.id === "hybrid-calibrated-v1",
    );
    assert.ok(hybrid, "hybrid matcher required");

    const run = (dataset: typeof matchingEvalDataset, boost: boolean) => {
      const prev = process.env.MATCHING_ROLE_BOOST;
      process.env.MATCHING_ROLE_BOOST = boost ? "true" : "false";
      try {
        return evaluateMatcherOnDataset(dataset, hybrid, 5, 0.6);
      } finally {
        if (prev === undefined) delete process.env.MATCHING_ROLE_BOOST;
        else process.env.MATCHING_ROLE_BOOST = prev;
      }
    };

    const trainOn = run(matchingEvalDataset, true);
    const trainOff = run(matchingEvalDataset, false);
    console.log(
      `train bad_queued boost=${trainOn.confusion.badQueued.length} off=${trainOff.confusion.badQueued.length}`,
    );

    const holdout = buildHoldoutEvalDataset();
    if (holdout) {
      const hOn = run(holdout, true);
      const hOff = run(holdout, false);
      console.log(
        `holdout bad_queued boost=${hOn.confusion.badQueued.length} off=${hOff.confusion.badQueued.length}`,
      );
      assert.ok(
        hOn.confusion.badQueued.length <= hOff.confusion.badQueued.length + 1,
        "role boost should not materially increase bad queued on holdout",
      );
    }

    void defaultRuleBasedMatcher;
  });
});
