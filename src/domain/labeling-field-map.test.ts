import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jobCandidateFieldRows } from "./labeling-field-map";
import { inferMatchCanonicalFromText, mergeMatchCanonical } from "./match-canonical";
import { emptyCandidateCard, emptyJobCard } from "./types";

describe("labeling-field-map", () => {
  it("treats Hebrew/English role and location as match, not conflict", () => {
    const job = mergeMatchCanonical(
      {
        ...emptyJobCard(),
        title: "Waiter",
        field: "Hospitality",
        location: "Tel Aviv",
        mustHaves: ["customer service", "English"],
        requiredLanguages: ["English"],
      },
      inferMatchCanonicalFromText({
        title: "Waiter",
        field: "Hospitality",
        mustHaves: ["customer service", "English"],
        languages: ["English"],
      }),
    );
    const candidate = mergeMatchCanonical(
      {
        ...emptyCandidateCard(),
        desiredRole: "מלצר",
        field: "מסעדנות",
        location: "תל אביב",
        skills: ["שירות לקוחות"],
        languages: ["רוסית"],
      },
      inferMatchCanonicalFromText({
        desiredRole: "מלצר",
        field: "מסעדנות",
        skills: ["שירות לקוחות"],
        languages: ["רוסית"],
      }),
    );
    const rows = jobCandidateFieldRows(job, candidate);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.align]));
    assert.equal(byKey.title, "match");
    assert.equal(byKey.field, "match");
    assert.equal(byKey.location, "match");
    assert.equal(byKey.mustHaves, "match");
    assert.equal(byKey.languages, "conflict");
  });
});
