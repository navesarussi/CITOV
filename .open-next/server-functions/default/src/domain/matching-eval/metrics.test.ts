import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gainForLabel,
  meanReciprocalRank,
  ndcgAtK,
  precisionAtK,
  recallAtK,
  reciprocalRank,
} from "./metrics";

describe("matching-eval metrics", () => {
  it("precision@k counts relevant in top k", () => {
    const ranked = ["a", "b", "c", "d", "e"];
    const rel = new Set(["b", "d", "x"]);
    const isRel = (id: string) => rel.has(id);
    assert.equal(precisionAtK(ranked, isRel, 5), 2 / 5);
    assert.equal(precisionAtK(ranked, isRel, 2), 0.5);
  });

  it("recall@k finds fraction of relevant set in top k", () => {
    const ranked = ["x", "a", "b", "c", "d"];
    const relevant = new Set(["a", "b", "c"]);
    assert.equal(recallAtK(ranked, relevant, 5), 1);
    assert.equal(recallAtK(ranked, relevant, 2), 1 / 3);
    assert.equal(recallAtK(ranked, new Set(), 5), 1);
  });

  it("reciprocal rank is 1/first relevant rank", () => {
    assert.equal(reciprocalRank(["x", "y", "good"], new Set(["good"])), 1 / 3);
    assert.equal(reciprocalRank(["bad"], new Set(["good"])), 0);
  });

  it("MRR averages reciprocal ranks", () => {
    assert.equal(meanReciprocalRank([1, 0.5, 0]), 0.5);
  });

  it("nDCG@k is 1 for perfect ranking", () => {
    const gains = [3, 2, 0, 0];
    assert.ok(Math.abs(ndcgAtK(gains, 4) - 1) < 1e-9);
  });

  it("nDCG@k drops when high gain is ranked lower", () => {
    const perfect = [3, 2, 1, 0];
    const weak = [0, 0, 3, 2];
    assert.ok(ndcgAtK(weak, 4) < ndcgAtK(perfect, 4));
  });

  it("gainForLabel maps labels", () => {
    assert.equal(gainForLabel("good"), 3);
    assert.equal(gainForLabel("acceptable"), 2);
    assert.equal(gainForLabel("bad"), 0);
    assert.equal(gainForLabel(undefined), 0);
  });
});
