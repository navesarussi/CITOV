import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyCandidateCard, emptyJobCard } from "../types";
import { evaluateMatcherOnDataset, defaultRuleBasedMatcher } from "./evaluate";
import type { MatchingEvalDataset } from "./types";

describe("matching-eval evaluate", () => {
  it("ranks exact role match above unrelated candidate", () => {
    const dataset: MatchingEvalDataset = {
      version: "test",
      description: "tiny",
      jobs: [
        {
          id: "j1",
          card: {
            ...emptyJobCard(),
            title: "מלצר",
            field: "מסעדנות",
            location: "תל אביב",
            mustHaves: ["שירות"],
          },
        },
      ],
      candidates: [
        {
          id: "good",
          card: {
            ...emptyCandidateCard(),
            desiredRole: "מלצר",
            field: "מסעדנות",
            location: "תל אביב",
            skills: ["שירות"],
          },
        },
        {
          id: "bad",
          card: {
            ...emptyCandidateCard(),
            desiredRole: "מפתח תוכנה",
            field: "הייטק",
            location: "חיפה",
            skills: ["Python"],
          },
        },
      ],
      labels: [
        { jobId: "j1", candidateId: "good", label: "good" },
        { jobId: "j1", candidateId: "bad", label: "bad" },
      ],
    };
    const result = evaluateMatcherOnDataset(dataset, defaultRuleBasedMatcher, 5);
    assert.equal(result.perJob[0].recallAt5, 1);
    assert.ok(result.perJob[0].precisionAt5 >= 0.2);
  });

  it("matches Hebrew/English role overlap when canonical tokens align", () => {
    const dataset: MatchingEvalDataset = {
      version: "test",
      description: "cross-lang",
      jobs: [
        {
          id: "j1",
          card: { ...emptyJobCard(), title: "Waiter", field: "Hospitality", location: "Tel Aviv" },
        },
      ],
      candidates: [
        {
          id: "he",
          card: {
            ...emptyCandidateCard(),
            desiredRole: "מלצר",
            field: "מסעדנות",
            location: "Tel Aviv",
          },
        },
      ],
      labels: [{ jobId: "j1", candidateId: "he", label: "good", reason: "synonym / english-hebrew" }],
    };
    const result = evaluateMatcherOnDataset(dataset, defaultRuleBasedMatcher, 5);
    assert.equal(result.confusion.goodMissed.length, 0);
    assert.ok(result.perJob[0].recallAt5 >= 1);
  });
});
