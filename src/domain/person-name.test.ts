import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractCvPersonName,
  namesLikelySamePerson,
  personNameFromCvFileName,
} from "./person-name";

describe("person-name", () => {
  it("detects mismatch between account and CV names", () => {
    assert.equal(namesLikelySamePerson("Lian Ben Haim", "Nave Sarussi"), false);
    assert.equal(namesLikelySamePerson("ליאן בן חיים", "Nave Sarussi"), false);
  });

  it("treats same name variants as match", () => {
    assert.equal(namesLikelySamePerson("Nave Sarussi", "Nave Sarussi"), true);
    assert.equal(namesLikelySamePerson("נוה סרוסי", "Nave Sarussi"), false);
  });

  it("parses CV filename", () => {
    assert.equal(
      personNameFromCvFileName("CV-Nave-Sarussi-Low-Level-EN.pdf"),
      "Nave Sarussi",
    );
  });

  it("extracts subject from explicit field", () => {
    assert.equal(
      extractCvPersonName({ subjectFullName: "Nave Sarussi", fileName: "x.pdf" }),
      "Nave Sarussi",
    );
  });
});
