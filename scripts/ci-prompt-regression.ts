import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runExtractionEval } from "../src/application/extraction-eval";
import {
  evaluateMatcherOnDataset,
  type MatcherEvalResult,
} from "../src/domain/matching-eval/evaluate";
import { matchingEvalDataset } from "../eval/matching/dataset";
import { createEvalMatcherDefinitions } from "../eval/matching/eval-matchers";
import { loadEvalEmbeddingFixture } from "../eval/matching/load-embed-fixture";
import { validateMatchingDataset } from "../eval/matching/validate-dataset";
import { checkChatPromptContactPolicy } from "../src/infrastructure/ai/prompt-contact-policy";
import { runCrossLangConsistencyEval } from "../eval/matching/cross-lang-eval";
import { CROSS_LANG_HOLDOUT_PAIRS } from "../eval/matching/cross-lang-holdout-dataset";

type Thresholds = {
  extraction: {
    minPrecision: number;
    minRecall: number;
    maxHallucinationRate: number;
  };
  matching: {
    matcherId: string;
    threshold: number;
    minMacroNdcgAtK: number;
    minMacroRecallAtK: number;
    maxBadQueued: number;
  };
  crossLang: {
    minOverallPassRate: number;
    maxScoreDelta: number;
  };
};

function loadThresholds(): Thresholds {
  const raw = readFileSync(join(process.cwd(), "eval/ci/regression-thresholds.json"), "utf8");
  return JSON.parse(raw) as Thresholds;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function checkExtraction(t: Thresholds["extraction"], lines: string[]): boolean {
  const r = runExtractionEval();
  lines.push("### חילוץ (golden set)");
  lines.push(
    `- דיוק: ${pct(r.precision)} (מינימום ${pct(t.minPrecision)})`,
  );
  lines.push(`- Recall: ${pct(r.recall)} (מינימום ${pct(t.minRecall)})`);
  lines.push(
    `- Hallucination: ${pct(r.hallucinationRate)} (מקסימום ${pct(t.maxHallucinationRate)})`,
  );
  return (
    r.precision >= t.minPrecision &&
    r.recall >= t.minRecall &&
    r.hallucinationRate <= t.maxHallucinationRate
  );
}

function checkMatching(t: Thresholds["matching"], lines: string[]): boolean {
  validateMatchingDataset(matchingEvalDataset);
  const fixture = loadEvalEmbeddingFixture();
  if (!fixture) {
    lines.push("### התאמה");
    lines.push("- **דילוג:** אין embedding fixture — CI לא יכול לבדוק hybrid.");
    return true;
  }
  const matcher = createEvalMatcherDefinitions(fixture).find((m) => m.id === t.matcherId);
  if (!matcher) {
    lines.push("### התאמה");
    lines.push(`- **שגיאה:** matcher ${t.matcherId} לא נמצא`);
    return false;
  }
  const r: MatcherEvalResult = evaluateMatcherOnDataset(
    matchingEvalDataset,
    matcher,
    5,
    t.threshold,
  );
  const badQueued = r.confusion.badQueued.length;
  lines.push(`### התאמה (${t.matcherId} @ ${t.threshold})`);
  lines.push(`- nDCG@5: ${r.macroNdcgAtK.toFixed(3)} (מינימום ${t.minMacroNdcgAtK})`);
  lines.push(`- Recall@5: ${pct(r.macroRecallAtK)} (מינימום ${pct(t.minMacroRecallAtK)})`);
  lines.push(`- bad queued: ${badQueued} (מקסימום ${t.maxBadQueued})`);
  return (
    r.macroNdcgAtK >= t.minMacroNdcgAtK &&
    r.macroRecallAtK >= t.minMacroRecallAtK &&
    badQueued <= t.maxBadQueued
  );
}

function checkCrossLangConsistency(
  t: Thresholds["crossLang"],
  lines: string[],
): boolean {
  const report = runCrossLangConsistencyEval(t.maxScoreDelta);
  lines.push("### התאמה רב-לשונית (HE↔EN)");
  lines.push(`- Pass rate: ${(report.overallPassRate * 100).toFixed(0)}% (מינימום ${(t.minOverallPassRate * 100).toFixed(0)}%)`);
  for (const [variant, rate] of Object.entries(report.variantPassRates)) {
    lines.push(`- ${variant}: ${(rate * 100).toFixed(0)}%`);
  }
  if (report.failures.length) {
    for (const f of report.failures.slice(0, 5)) {
      lines.push(`- **כשל:** ${f}`);
    }
  }
  return report.overallPassRate >= t.minOverallPassRate;
}

/** Holdout is report-only — never fails CI (no alias tuning on this set). */
function reportCrossLangHoldout(lines: string[]): void {
  const report = runCrossLangConsistencyEval(undefined, CROSS_LANG_HOLDOUT_PAIRS);
  lines.push("### התאמה רב-לשונית — holdout קפוא (15 זוגות, ללא כיוון aliases)");
  lines.push(
    `- Pass rate: ${(report.overallPassRate * 100).toFixed(0)}% (**דיווח בלבד**, לא סף merge)`,
  );
  for (const [variant, rate] of Object.entries(report.variantPassRates)) {
    lines.push(`- ${variant}: ${(rate * 100).toFixed(0)}%`);
  }
  if (report.failures.length) {
    for (const f of report.failures.slice(0, 8)) {
      lines.push(`- כשל holdout: ${f}`);
    }
  }
}

function checkContactPromptPolicy(lines: string[]): boolean {
  const violations = checkChatPromptContactPolicy();
  lines.push("### מדיניות יצירת קשר (prompts)");
  if (!violations.length) {
    lines.push("- אין בקשות לטלפון/אימייל בפרומפטי employer/candidate");
    return true;
  }
  for (const v of violations) {
    lines.push(`- **${v.prompt}** — ${v.patternId}: \`${v.excerpt}\``);
  }
  return false;
}

function main(): void {
  const thresholds = loadThresholds();
  const lines: string[] = ["## בדיקת רגרסיה (prompts / matching)", ""];
  const okContact = checkContactPromptPolicy(lines);
  lines.push("");
  const okCrossLang = checkCrossLangConsistency(thresholds.crossLang, lines);
  reportCrossLangHoldout(lines);
  lines.push("");
  const okExtract = checkExtraction(thresholds.extraction, lines);
  lines.push("");
  const okMatch = checkMatching(thresholds.matching, lines);
  const ok = okContact && okCrossLang && okExtract && okMatch;
  lines.push("");
  lines.push(ok ? "**✅ עבר**" : "**❌ נכשל — אל תפרסמו prompts בלי בדיקה ידנית**");

  const summary = lines.join("\n");
  console.log(summary);
  const summaryPath = process.env.REGRESSION_SUMMARY_PATH ?? join(process.cwd(), "eval/ci/last-run-summary.md");
  appendFileSync(summaryPath, `${summary}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
  if (!ok) process.exit(1);
}

main();
