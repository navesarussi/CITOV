import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyCandidateCard } from "./types";
import {
  anonymizedMatchReason,
  projectCandidateCardAnonymized,
} from "./employer-candidate-privacy";

describe("employer-candidate-privacy", () => {
  it("strips identifying card fields for queued view", () => {
    const card = {
      ...emptyCandidateCard(),
      summary: "נועה כהן מטל אביב",
      narrative: "סיפור אישי",
      location: "תל אביב",
      desiredRole: "מלצרית",
      field: "מסעדנות",
      skills: ["שירות"],
      experienceYears: 3,
    };
    const anon = projectCandidateCardAnonymized(card);
    assert.equal(anon.summary, undefined);
    assert.equal(anon.location, undefined);
    assert.equal(anon.desiredRole, undefined);
    assert.equal(anon.field, "מסעדנות");
    assert.deepEqual(anon.skills, ["שירות"]);
  });

  it("returns generic match reason", () => {
    assert.match(anonymizedMatchReason(), /התאמה/);
  });
});
