import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowsCandidateField,
  candidateCardViewLines,
  CANDIDATE_PRESENTATION_KEYS,
  EMPLOYER_PRESENTATION_KEYS,
  projectCandidateCard,
} from "./candidate-card-views";
import { emptyCandidateCard } from "./types";

describe("candidate-card-views", () => {
  const card = {
    ...emptyCandidateCard(),
    summary: "Strong waiter",
    narrative: "Loves hospitality",
    desiredRole: "Waiter",
    field: "Restaurants",
    skills: ["Service"],
    salaryExpectation: "₪40/h",
    weaknesses: "Impatient",
    dealBreakers: "No nights",
    personality: "Warm",
    flexibility: 7,
  };

  it("candidate view excludes salary, weaknesses, deal-breakers, narrative", () => {
    assert.equal(allowsCandidateField("candidate", "salaryExpectation"), false);
    assert.equal(allowsCandidateField("candidate", "weaknesses"), false);
    assert.equal(allowsCandidateField("candidate", "dealBreakers"), false);
    assert.equal(allowsCandidateField("candidate", "narrative"), false);
    assert.equal(allowsCandidateField("candidate", "desiredRole"), true);

    const keys = candidateCardViewLines(card, "candidate", {}).map((l) => l.key);
    assert.ok(keys.includes("desiredRole"));
    assert.ok(!keys.includes("salaryExpectation"));
    assert.ok(!keys.includes("weaknesses"));
    assert.ok(!keys.includes("narrative"));
  });

  it("employer view includes hiring signals and salary, hides weaknesses", () => {
    assert.equal(allowsCandidateField("employer", "narrative"), true);
    assert.equal(allowsCandidateField("employer", "salaryExpectation"), true);
    assert.equal(allowsCandidateField("employer", "weaknesses"), false);
    assert.equal(allowsCandidateField("employer", "dealBreakers"), false);

    const keys = candidateCardViewLines(card, "employer", {}).map((l) => l.key);
    assert.ok(keys.includes("narrative"));
    assert.ok(keys.includes("salaryExpectation"));
    assert.ok(keys.includes("flexibility"));
    assert.ok(!keys.includes("weaknesses"));
  });

  it("full view includes sensitive fields and extras", () => {
    const full = {
      ...card,
      extras: { customNote: "admin only" },
    };
    const keys = candidateCardViewLines(full, "full", {}).map((l) => l.key);
    assert.ok(keys.includes("weaknesses"));
    assert.ok(keys.includes("dealBreakers"));
    assert.ok(keys.includes("extra:customNote"));
  });

  it("projectCandidateCard strips disallowed keys for employer API", () => {
    const projected = projectCandidateCard(card, "employer");
    assert.equal(projected.desiredRole, "Waiter");
    assert.equal(projected.salaryExpectation, "₪40/h");
    assert.equal((projected as { weaknesses?: string }).weaknesses, undefined);
  });

  it("presentation key sets stay disjoint on critical privacy fields", () => {
    assert.ok(!CANDIDATE_PRESENTATION_KEYS.includes("salaryExpectation" as never));
    assert.ok(EMPLOYER_PRESENTATION_KEYS.includes("salaryExpectation"));
    assert.ok(!EMPLOYER_PRESENTATION_KEYS.includes("weaknesses" as never));
  });
});
