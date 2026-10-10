import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeCalibratedSemanticFit,
  computeHybridBaseFit,
  computeSemanticSimilarity,
} from "./semantic-matching";
import { buildSemanticOptions } from "./semantic-matching";
import { emptyCandidateCard, emptyJobCard } from "./types";

describe("semantic-matching", () => {
  it("hybrid blends rule and semantic components", () => {
    const candidate = {
      ...emptyCandidateCard(),
      desiredRole: "מלצר",
      field: "מסעדנות",
      location: "תל אביב",
      skills: ["שירות", "עברית"],
    };
    const job = {
      ...emptyJobCard(),
      title: "מלצר/ית",
      field: "מסעדנות",
      location: "תל אביב",
      mustHaves: ["שירות"],
    };
    const strong = { role: [1, 0, 0], skills: [1, 0, 0], profile: [1, 0, 0] };
    const weak = { role: [0, 1, 0], skills: [0, 0, 1], profile: [0, 1, 0] };
    const weakCandidate = { ...candidate, desiredRole: "מפתח", field: "הייטק", skills: ["Java"] };
    const opts = buildSemanticOptions(candidate, job);
    const hybridStrong = computeHybridBaseFit(candidate, job, strong, strong, undefined, opts);
    const hybridWeak = computeHybridBaseFit(weakCandidate, job, weak, weak, undefined, {
      ...opts,
      candidateTexts: buildSemanticOptions(weakCandidate, job).candidateTexts,
    });
    assert.ok(hybridStrong > hybridWeak);
  });

  it("semantic similarity is 1 for identical vectors", () => {
    const v = [0.2, 0.5, 0.9];
    assert.ok(Math.abs(computeSemanticSimilarity({ role: v }, { role: v }) - 1) < 1e-6);
  });
});
