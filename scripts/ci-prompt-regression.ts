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

function main(): void {
  const thresholds = loadThresholds();
  const lines: string[] = ["## בדיקת רגרסיה (prompts / matching)", ""];
  const okExtract = checkExtraction(thresholds.extraction, lines);
  lines.push("");
  const okMatch = checkMatching(thresholds.matching, lines);
  const ok = okExtract && okMatch;
  lines.push("");
  lines.push(ok ? "**✅ עבר**" : "**❌ נכשל — אל תפרסמו prompts בלי בדיקה ידנית**");

  const summary = lines.join("\n");
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
  if (!ok) process.exit(1);
}

main();
