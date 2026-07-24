import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { needsTranslationToLocale } from "./display-locale";

describe("needsTranslationToLocale", () => {
  it("detects English text for Hebrew UI", () => {
    assert.equal(
      needsTranslationToLocale(
        "Senior software engineer with 8 years of experience in React and Node.",
        "he",
      ),
      true,
    );
  });

  it("skips Hebrew text for Hebrew UI", () => {
    assert.equal(
      needsTranslationToLocale("מהנדס תוכנה בכיר עם ניסיון של שמונה שנים בפיתוח.", "he"),
      false,
    );
  });

  it("detects Hebrew text for English UI", () => {
    assert.equal(
      needsTranslationToLocale("מהנדס תוכנה בכיר עם ניסיון רב בפיתוח מערכות ווב מודרניות.", "en"),
      true,
    );
  });

  it("returns false for empty text", () => {
    assert.equal(needsTranslationToLocale("   ", "he"), false);
  });
});
