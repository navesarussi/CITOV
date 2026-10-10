import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MATCHING_FIELD_AUDIT } from "./matching-critical-fields";

describe("matching-critical-fields audit", () => {
  it("lists canonical vs embedding-only fields", () => {
    const canonical = MATCHING_FIELD_AUDIT.filter((r) => r.canonicalEnglish);
    assert.ok(canonical.length >= 5);
    const freeText = MATCHING_FIELD_AUDIT.filter((r) => r.usedInSemanticProfile && !r.canonicalEnglish);
    assert.ok(freeText.some((r) => r.field.includes("narrative")));
  });
});
