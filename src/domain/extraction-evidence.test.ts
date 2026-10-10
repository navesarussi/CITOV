import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeExperienceYearsFromWorkHistory,
  evidenceAppearsInSource,
  gateExtractedFields,
  validateExtractedField,
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

  it("derives experience years from work history dates", () => {
    const years = computeExperienceYearsFromWorkHistory([
      { company: "A", title: "Waiter", startDate: "2020", endDate: "2023" },
      { company: "B", title: "Waiter", startDate: "2023", isCurrent: true },
    ]);
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
    );
    assert.equal(r.ok, true);
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
