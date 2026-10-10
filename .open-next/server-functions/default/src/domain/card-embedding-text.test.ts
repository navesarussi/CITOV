import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { candidateEmbeddingTexts, jobEmbeddingTexts } from "./card-embedding-text";
import { emptyCandidateCard, emptyJobCard } from "./types";

describe("card-embedding-text", () => {
  it("keeps salary and location out of role/skills segments", () => {
    const c = {
      ...emptyCandidateCard(),
      desiredRole: "מלצר",
      field: "מסעדנות",
      location: "תל אביב",
      salaryExpectation: "100000",
      skills: ["שירות"],
    };
    const texts = candidateEmbeddingTexts(c);
    assert.match(texts.role, /מלצר/);
    assert.doesNotMatch(texts.role, /תל אביב/);
    assert.doesNotMatch(texts.role, /100000/);
    assert.match(texts.skills, /שירות/);
  });

  it("job skills segment includes must-haves not location", () => {
    const j = {
      ...emptyJobCard(),
      title: "Waiter",
      location: "Tel Aviv",
      mustHaves: ["English"],
    };
    const texts = jobEmbeddingTexts(j);
    assert.match(texts.skills, /English/);
    assert.doesNotMatch(texts.skills, /Tel Aviv/);
  });
});
