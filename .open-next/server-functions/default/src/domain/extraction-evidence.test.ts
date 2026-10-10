import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeExperienceYearsFromWorkHistory,
  evidenceAppearsInSource,
  gateExtractedFields,
  validateExtractedField,
  validateFieldSanity,
} from "./extraction-evidence";

describe("extraction-evidence", () => {
  const cv = `
    דנה כהן — מלצרית
    2020–2023: מסעדת הים, תל אביב
    2023–היום: קפה רוטשילד
    שכר מבוקש: 45 ש"ח לשעה
  `;

  it("accepts evidence substring in source", () => {
    assert.equal(
      validateExtractedField(
        { fieldKey: "desiredRole", value: "מלצרית", evidence: "מלצרית", confidence: "high" },
        cv,
      ).ok,
      true,
    );
  });

  it("rejects evidence not in source", () => {
    const r = validateExtractedField(
      { fieldKey: "location", value: "חיפה", evidence: "עובד בחיפה", confidence: "high" },
      cv,
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "evidence_not_in_source");
  });

  it("merges overlapping work-history years (2019–2021 + 2020–2023 = 4y)", () => {
    const years = computeExperienceYearsFromWorkHistory(
      [
        { company: "A", title: "Waiter", startDate: "2019", endDate: "2021" },
        { company: "B", title: "Shift manager", startDate: "2020", endDate: "2023" },
      ],
      new Date("2025-06-01"),
    );
    assert.equal(years, 4);
  });

  it("derives experience years from work history dates", () => {
    const years = computeExperienceYearsFromWorkHistory(
      [
        { company: "A", title: "Waiter", startDate: "2020", endDate: "2023" },
        { company: "B", title: "Waiter", startDate: "2023", isCurrent: true },
      ],
      new Date("2025-10-01"),
    );
    assert.ok(years != null && years >= 4);
    const r = validateExtractedField(
      {
        fieldKey: "experienceYears",
        value: String(Math.round(years!)),
        evidence: "2020–2023: מסעדת הים",
        confidence: "high",
      },
      cv,
      [
        { company: "A", title: "Waiter", startDate: "2020", endDate: "2023" },
        { company: "B", title: "Waiter", startDate: "2023", isCurrent: true },
      ],
      new Date("2025-10-01"),
    );
    assert.equal(r.ok, true);
  });

  it("rejects numbers not present in field evidence (not whole CV)", () => {
    const r = validateExtractedField(
      {
        fieldKey: "salaryMin",
        value: "45",
        evidence: "שכר מבוקש לפי ניסיון בתל אביב",
        confidence: "high",
      },
      "שכר מבוקש לפי ניסיון בתל אביב — ללא סכום מפורש",
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "numbers_unsupported");
  });

  it("accepts salary number when evidence quote contains it", () => {
    const r = validateExtractedField(
      {
        fieldKey: "salaryMin",
        value: "45",
        evidence: 'שכר מבוקש: 45 ש"ח לשעה',
        confidence: "high",
      },
      cv,
    );
    assert.equal(r.ok, true);
  });

  it("validateFieldSanity rejects experienceYears out of range", () => {
    const s = validateFieldSanity({ fieldKey: "experienceYears", value: "75", evidence: "x" });
    assert.equal(s.ok, false);
  });

  it("validateFieldSanity rejects non-positive salary", () => {
    const s = validateFieldSanity({ fieldKey: "salaryMin", value: "0", evidence: "x" });
    assert.equal(s.ok, false);
  });

  it("gates failed sanity to pending with reason", () => {
    const g = gateExtractedFields({
      sourceText: `${cv}\nניסיון: 80 שנים`,
      patch: {},
      extractedFields: [
        {
          fieldKey: "experienceYears",
          value: "80",
          evidence: "ניסיון: 80 שנים",
          confidence: "high",
        },
      ],
    });
    assert.equal(Object.keys(g.acceptedPatch).length, 0);
    assert.equal(g.pendingConfirmations.length, 1);
    assert.match(g.rejected[0]?.reason ?? "", /sanity_failed/);
  });

  it("gates medium confidence to pending", () => {
    const g = gateExtractedFields({
      sourceText: cv,
      patch: {},
      extractedFields: [
        { fieldKey: "desiredRole", value: "מלצרית", evidence: "מלצרית", confidence: "medium" },
      ],
    });
    assert.equal(Object.keys(g.acceptedPatch).length, 0);
    assert.equal(g.pendingConfirmations.length, 1);
  });

  it("evidenceAppearsInSource token overlap", () => {
    assert.equal(evidenceAppearsInSource("מסעדת הים תל אביב", cv), true);
  });
});
