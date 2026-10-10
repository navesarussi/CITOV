import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { builtinDomainQuestions, detectWorkDomain } from "./work-domain";
import { emptyCandidateCard } from "./types";

describe("work-domain", () => {
  it("detects technology from Hebrew field", () => {
    assert.equal(detectWorkDomain({ field: "הייטק" }), "technology");
  });

  it("offers hi-tech intake questions when stack missing", () => {
    const card = {
      ...emptyCandidateCard(),
      field: "הייטק",
      desiredRole: "מפתח",
      skills: ["React"],
    };
    const qs = builtinDomainQuestions(card);
    assert.ok(qs.some((q) => q.id.includes("techStack")));
  });
});
