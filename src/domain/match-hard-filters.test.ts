import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateMatchHardFilters } from "./match-hard-filters";
import { emptyCandidateCard, emptyJobCard } from "./types";

describe("match-hard-filters", () => {
  it("blocks when salary hard filter enabled and candidate min above job max", () => {
    const candidate = {
      ...emptyCandidateCard(),
      salaryMin: "35000",
    };
    const job = {
      ...emptyJobCard(),
      salaryMax: "28000",
      salaryBandHardFilter: true,
    };
    const r = evaluateMatchHardFilters(candidate, job);
    assert.equal(r.pass, false);
  });

  it("passes when hard filter off", () => {
    const candidate = { ...emptyCandidateCard(), salaryMin: "50000" };
    const job = { ...emptyJobCard(), salaryMax: "20000" };
    assert.equal(evaluateMatchHardFilters(candidate, job).pass, true);
  });
});
