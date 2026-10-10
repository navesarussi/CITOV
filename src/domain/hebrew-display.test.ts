import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hebrewDisplayJobCard, hebrewDisplayText, hebrewDisplayToken } from "./hebrew-display";
import { emptyJobCard } from "./types";

describe("hebrew-display", () => {
  it("translates common English job tokens for Hebrew UI", () => {
    assert.equal(hebrewDisplayToken("Waiter"), "מלצר/ית");
    assert.equal(hebrewDisplayToken("Tel Aviv"), "תל אביב");
    assert.equal(hebrewDisplayToken("Hospitality"), "מסעדנות");
    assert.equal(hebrewDisplayText("customer service, English"), "שירות לקוחות, אנגלית");
  });

  it("localizes job card fields for display", () => {
    const card = hebrewDisplayJobCard({
      ...emptyJobCard(),
      title: "Waiter",
      field: "Hospitality",
      location: "Tel Aviv",
      personalityFit: "friendly and patient",
      salaryRange: "35-45 NIS/hour",
    });
    assert.equal(card.title, "מלצר/ית");
    assert.match(card.personalityFit ?? "", /אדיבות/);
  });
});
