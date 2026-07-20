import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  candidateRows,
  knowledgePercent,
  jobRows,
} from "./card-progress";
import { emptyCandidateCard, emptyJobCard } from "./types";

describe("knowledgePercent", () => {
  it("returns 0 for an empty candidate card", () => {
    const rows = candidateRows(emptyCandidateCard());
    assert.equal(knowledgePercent(rows), 0);
  });

  it("returns 100 when all relevant fields are filled", () => {
    const rows = [
      { key: "desiredRole", filled: true },
      { key: "field", filled: true },
      { key: "flexibility", filled: true },
    ];
    assert.equal(knowledgePercent(rows), 100);
  });

  it("ignores flexibility in the percentage", () => {
    const rows = [
      { key: "desiredRole", filled: true },
      { key: "field", filled: false },
      { key: "flexibility", filled: true },
    ];
    assert.equal(knowledgePercent(rows), 50);
  });

  it("rounds to nearest integer", () => {
    const rows = [
      { key: "a", filled: true },
      { key: "b", filled: false },
      { key: "c", filled: false },
    ];
    assert.equal(knowledgePercent(rows), 33);
  });

  it("increases as candidate fields fill", () => {
    const empty = knowledgePercent(candidateRows(emptyCandidateCard()));
    const partial = knowledgePercent(
      candidateRows({
        ...emptyCandidateCard(),
        desiredRole: "מלצר",
        field: "מסעדנות",
        location: "תל אביב",
        skills: ["שירות"],
        personality: "חברותי",
      }),
    );
    assert.equal(empty, 0);
    assert.ok(partial > empty);
    assert.ok(partial < 100);
  });

  it("works for job cards", () => {
    const empty = knowledgePercent(jobRows(emptyJobCard()));
    const partial = knowledgePercent(
      jobRows({
        ...emptyJobCard(),
        title: "מלצר/ית",
        field: "מסעדנות",
        mustHaves: ["שירות"],
      }),
    );
    assert.equal(empty, 0);
    assert.ok(partial > 0);
  });
});
