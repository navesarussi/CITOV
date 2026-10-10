import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyCandidateCard, emptyJobCard } from "./types";
import { labelingCandidateRows, labelingJobRows } from "./labeling-card-rows";

describe("labeling-card-rows", () => {
  it("lists every predefined job field and all filled candidate full-view lines", () => {
    assert.ok(labelingJobRows(emptyJobCard()).length >= 30);
    const card = {
      ...emptyCandidateCard(),
      desiredRole: "מפתח/ת",
      physicalRequirementsOk: "כן",
      weaknesses: "פרט",
    };
    const rows = labelingCandidateRows(card);
    assert.ok(rows.some((r) => r.label.includes("דרישות פיזיות")));
    assert.ok(rows.some((r) => r.label.includes("נקודות לשיפור")));
  });
});
