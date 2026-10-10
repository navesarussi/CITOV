import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseLabelCsv, rowsToEvalLabels } from "./parse-label-csv";

describe("parseLabelCsv", () => {
  it("parses BOM CSV and filters labeled rows", () => {
    const csv =
      '\uFEFFpair_id,job_id,candidate_id,label,note\n"j01__c99","j01","c99","good","ok"\n"j02__c01","j02","c01","",""\n';
    const { rows, errors } = parseLabelCsv(csv);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 2);
    const labels = rowsToEvalLabels(rows);
    assert.equal(labels.length, 1);
    assert.equal(labels[0].jobId, "j01");
    assert.equal(labels[0].label, "good");
  });

  it("rejects invalid labels", () => {
    const csv = "pair_id,job_id,candidate_id,label,note\np,j01,c01,maybe,\n";
    const { errors } = parseLabelCsv(csv);
    assert.ok(errors.some((e) => e.includes("invalid label")));
  });
});
