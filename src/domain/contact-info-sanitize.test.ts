import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  messageContainsContactInfo,
  replyRequestsContactDetails,
  sanitizeJobPatch,
  sanitizeCandidatePatch,
  maybeAppendPlatformContactNotice,
  PLATFORM_CONTACT_NOTICE_HE,
} from "./contact-info-sanitize";

describe("contact-info-sanitize", () => {
  it("drops job contactName/contactPhone from patches", () => {
    const { value, strippedFromPatch } = sanitizeJobPatch({
      title: "מפתח/ת",
      contactName: "דנה",
      contactPhone: "050-1234567",
    });
    assert.equal(strippedFromPatch, true);
    assert.equal(value?.title, "מפתח/ת");
    assert.equal(value?.contactName, undefined);
    assert.equal(value?.contactPhone, undefined);
  });

  it("redacts IL phone and email from narrative fields", () => {
    const { value, strippedFromPatch } = sanitizeCandidatePatch({
      narrative: "הגעה מהירה, טלפון 050-9876543 או foo@bar.com",
    });
    assert.equal(strippedFromPatch, true);
    assert.equal(String(value?.narrative).includes("050"), false);
    assert.equal(String(value?.narrative).includes("@"), false);
  });

  it("detects volunteered contact in user messages", () => {
    assert.equal(messageContainsContactInfo("הטלפון שלי 052-1112233"), true);
    assert.equal(messageContainsContactInfo("רק עבודה מהבית"), false);
  });

  it("detects agent replies that ask for contact details", () => {
    assert.equal(
      replyRequestsContactDetails("מה השם ומספר הטלפון שלך ליצירת קשר?"),
      true,
    );
    assert.equal(replyRequestsContactDetails("ספר/י על היום-יום בתפקיד"), false);
  });

  it("appends platform contact notice when needed", () => {
    const out = maybeAppendPlatformContactNotice("תודה!", {
      userMessage: "050-1234567",
    });
    assert.ok(out.includes(PLATFORM_CONTACT_NOTICE_HE));
  });
});
