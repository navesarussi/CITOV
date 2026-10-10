import type { ExtractedField } from "../../src/domain/extraction-evidence";

export type GoldenExtractionCase = {
  id: string;
  kind: "cv" | "job";
  locale: "he" | "en";
  sourceText: string;
  modelFields: ExtractedField[];
  expectAccept: string[];
  expectReject: string[];
};

/** Synthetic golden set — modelFields simulate LLM output before gating. */
export const goldenExtractionCases: GoldenExtractionCase[] = [
  {
    id: "cv-he-waiter-1",
    kind: "cv",
    locale: "he",
    sourceText: "דנה כהן, מלצרית, 2020-2023 מסעדת הים תל אביב, מחפשת עבודה בערב",
    modelFields: [
      { fieldKey: "desiredRole", value: "מלצרית", evidence: "מלצרית", confidence: "high" },
      { fieldKey: "location", value: "חיפה", evidence: "עובדת בחיפה", confidence: "high" },
    ],
    expectAccept: ["desiredRole"],
    expectReject: ["location"],
  },
  {
    id: "cv-en-dev-1",
    kind: "cv",
    locale: "en",
    sourceText: "John Smith, Software Engineer at Acme 2019-2024, React and Node",
    modelFields: [
      { fieldKey: "desiredRole", value: "Software Engineer", evidence: "Software Engineer", confidence: "high" },
      { fieldKey: "skills", value: "React, Node", evidence: "React and Node", confidence: "high" },
    ],
    expectAccept: ["desiredRole", "skills"],
    expectReject: [],
  },
  {
    id: "cv-he-salary-hallucination",
    kind: "cv",
    locale: "he",
    sourceText: "יוסי לevi, נהג משאית, רישיון C",
    modelFields: [
      { fieldKey: "drivingLicense", value: "C", evidence: "רישיון C", confidence: "high" },
      { fieldKey: "salaryExpectation", value: "25000", evidence: "שכר 25000", confidence: "high" },
    ],
    expectAccept: ["drivingLicense"],
    expectReject: ["salaryExpectation"],
  },
  {
    id: "job-he-cashier",
    kind: "job",
    locale: "he",
    sourceText: "דרוש/ה קופאי/ת לסupermarket בראשון, משמרות בוקר, שכר 38 ש\"ח לשעה",
    modelFields: [
      { fieldKey: "title", value: "קופאי/ת", evidence: "קופאי/ת", confidence: "high" },
      { fieldKey: "location", value: "ראשון לציון", evidence: "בראשון", confidence: "high" },
      { fieldKey: "salaryRange", value: "38", evidence: "38 ש\"ח לשעה", confidence: "high" },
    ],
    expectAccept: ["title", "location", "salaryRange"],
    expectReject: [],
  },
  {
    id: "job-en-remote-hallucination",
    kind: "job",
    locale: "en",
    sourceText: "Hiring barista, downtown cafe, morning shifts",
    modelFields: [
      { fieldKey: "title", value: "Barista", evidence: "barista", confidence: "high" },
      { fieldKey: "workModel", value: "Remote", evidence: "fully remote", confidence: "high" },
    ],
    expectAccept: ["title"],
    expectReject: ["workModel"],
  },
];

// Expand to target counts with variations
while (goldenExtractionCases.filter((c) => c.kind === "cv").length < 15) {
  const i = goldenExtractionCases.filter((c) => c.kind === "cv").length + 1;
  goldenExtractionCases.push({
    id: `cv-synth-${i}`,
    kind: "cv",
    locale: i % 2 ? "he" : "en",
    sourceText: i % 2 ? `מועמד ${i}, ניסיון ${i} שנים בתחום שירות` : `Candidate ${i}, ${i} years in retail`,
    modelFields: [
      {
        fieldKey: "experienceYears",
        value: String(i),
        evidence: i % 2 ? `${i} שנים` : `${i} years`,
        confidence: "medium",
      },
    ],
    expectAccept: [],
    expectReject: ["experienceYears"],
  });
}

while (goldenExtractionCases.filter((c) => c.kind === "job").length < 10) {
  const i = goldenExtractionCases.filter((c) => c.kind === "job").length + 1;
  goldenExtractionCases.push({
    id: `job-synth-${i}`,
    kind: "job",
    locale: i % 2 ? "he" : "en",
    sourceText: i % 2 ? `משרה ${i}: מלצר/ית, תל אביב` : `Job ${i}: Waiter, Tel Aviv`,
    modelFields: [
      {
        fieldKey: "title",
        value: i % 2 ? "מלצר/ית" : "Waiter",
        evidence: i % 2 ? "מלצר/ית" : "Waiter",
        confidence: "high",
      },
    ],
    expectAccept: ["title"],
    expectReject: [],
  });
}
