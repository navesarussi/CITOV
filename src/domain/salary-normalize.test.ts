import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseSalaryTextToMonthlyIls,
  salaryMonthlyOverlapScore,
} from "./salary-normalize";

describe("salary-normalize", () => {
  it("parses K and ranges to monthly ILS", () => {
    const r = parseSalaryTextToMonthlyIls("25-30K ₪");
    assert.equal(r.min, 25000);
    assert.equal(r.max, 30000);
  });

  it("converts yearly to monthly", () => {
    const r = parseSalaryTextToMonthlyIls("180,000 NIS per year");
    assert.equal(r.min, 15000);
    assert.equal(r.max, 15000);
  });

  it("scores interval overlap", () => {
    const s = salaryMonthlyOverlapScore({ min: 20000, max: 25000 }, { min: 22000, max: 28000 });
    assert.ok(s > 0.3 && s < 1);
  });
});
