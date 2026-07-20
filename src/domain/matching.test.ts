import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyFlexibility,
  combineFlexibility,
  computeBaseFit,
  shouldQueueForEmployer,
} from "./matching";
import { emptyCandidateCard, emptyJobCard } from "./types";
import { unansweredQuestionsForCandidate } from "./field-questions";

describe("matching", () => {
  it("scores similar role and field higher", () => {
    const candidate = {
      ...emptyCandidateCard(),
      desiredRole: "מלצר",
      field: "מסעדנות",
      location: "תל אביב",
      skills: ["שירות", "עברית"],
      flexibility: 5,
    };
    const job = {
      ...emptyJobCard(),
      title: "מלצר/ית",
      field: "מסעדנות",
      location: "תל אביב",
      mustHaves: ["שירות"],
    };
    const base = computeBaseFit(candidate, job);
    assert.ok(base >= 0.4);
    assert.equal(shouldQueueForEmployer(applyFlexibility(base, 5)), true);
  });

  it("strict flexibility lowers weak matches", () => {
    const weak = applyFlexibility(0.4, 10);
    const flexible = applyFlexibility(0.4, 1);
    assert.ok(flexible > weak);
  });

  it("combines candidate and job flexibility by average", () => {
    assert.equal(combineFlexibility(1, 1), 1);
    assert.equal(combineFlexibility(10, 10), 10);
    assert.equal(combineFlexibility(1, 10), 6);
    assert.equal(combineFlexibility(4, 8), 6);
  });
});

describe("field questions", () => {
  it("returns only unanswered questions for same field", () => {
    const candidate = { ...emptyCandidateCard(), field: "לוגיסטיקה" };
    const questions = [
      {
        id: "q1",
        field: "לוגיסטיקה",
        question: "יש רישיון מלגזה?",
        sourceJobId: "e1",
        sourceEmployerId: "u1",
        createdAt: new Date().toISOString(),
      },
      {
        id: "q2",
        field: "מסעדנות",
        question: "יש ניסיון בבר?",
        sourceJobId: "e2",
        sourceEmployerId: "u2",
        createdAt: new Date().toISOString(),
      },
    ];
    const open = unansweredQuestionsForCandidate(candidate, questions, [], "c1");
    assert.equal(open.length, 1);
    assert.equal(open[0].id, "q1");
  });
});
