import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  defaultRuleBasedMatcher,
  evaluateMatcherOnDataset,
  type MatcherEvalResult,
} from "../src/domain/matching-eval/evaluate";
import type { MatcherDefinition } from "../src/domain/matching-eval/types";
import { matchingEvalDataset } from "../eval/matching/dataset";
import { createEvalMatcherDefinitions } from "../eval/matching/eval-matchers";
import { loadEvalEmbeddingFixture } from "../eval/matching/load-embed-fixture";
import { validateMatchingDataset } from "../eval/matching/validate-dataset";

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function printTable(results: MatcherEvalResult[]): void {
  const header = ["Matcher", "P@5", "R@5", "MRR", "nDCG@5", "Good missed", "Bad queued"];
  const rows = results.map((r) => [
    r.matcherId,
    formatPct(r.macroPrecisionAtK),
    formatPct(r.macroRecallAtK),
    r.mrr.toFixed(3),
    r.macroNdcgAtK.toFixed(3),
    String(r.confusion.goodMissed.length),
    String(r.confusion.badQueued.length),
  ]);
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((row) => row[i].length)),
  );
  const line = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join("  ");
  console.log(line(header));
  console.log(line(widths.map((w) => "-".repeat(w))));
  for (const row of rows) console.log(line(row));
}

function printFailures(r: MatcherEvalResult): void {
  console.log(`\n=== ${r.matcherLabel} — failure categories ===`);
  for (const cat of r.failureCategories) {
    console.log(`\n${cat.category} (${cat.count})`);
    for (const ex of cat.examples) console.log(`  • ${ex}`);
  }
}

function sweepHybridThreshold(matcher: MatcherDefinition): void {
  let best = { t: 0.28, score: -Infinity, result: null as MatcherEvalResult | null };
  for (let t = 0.18; t <= 0.36; t += 0.01) {
    const rounded = Math.round(t * 100) / 100;
    const result = evaluateMatcherOnDataset(matchingEvalDataset, matcher, 5, rounded);
    const objective =
      result.macroNdcgAtK * 0.5 +
      result.macroRecallAtK * 0.3 -
      result.confusion.badQueued.length * 0.05 -
      result.confusion.goodMissed.length * 0.08;
    if (objective > best.score) {
      best = { t: rounded, score: objective, result };
    }
  }
  if (!best.result) return;
  console.log(
    `\n=== Hybrid threshold sweep (hybrid-v1) — best ≈ ${best.t} (objective ${best.score.toFixed(3)}) ===`,
  );
  console.log(
    `  P@5=${formatPct(best.result.macroPrecisionAtK)} R@5=${formatPct(best.result.macroRecallAtK)} nDCG@5=${best.result.macroNdcgAtK.toFixed(3)} goodMissed=${best.result.confusion.goodMissed.length} badQueued=${best.result.confusion.badQueued.length}`,
  );
}

function buildMatchers(): MatcherDefinition[] {
  const list: MatcherDefinition[] = [defaultRuleBasedMatcher];
  const fixture = loadEvalEmbeddingFixture();
  if (fixture) {
    console.log(
      `Loaded embedding fixture: generator=${fixture.generator} model=${fixture.model} entities=${Object.keys(fixture.entities).length}`,
    );
    list.push(...createEvalMatcherDefinitions(fixture));
  } else {
    console.warn(
      "No embedding fixture found — run npm run eval:embed-fixtures (semantic/hybrid skipped).",
    );
  }
  return list;
}

function main(): void {
  validateMatchingDataset(matchingEvalDataset);
  const MATCHERS = buildMatchers();

  const outDir = join(process.cwd(), "eval/matching/results");
  mkdirSync(outDir, { recursive: true });

  const allResults: MatcherEvalResult[] = MATCHERS.map((m) =>
    evaluateMatcherOnDataset(matchingEvalDataset, m, 5, 0.28),
  );

  console.log(
    `\nMatching eval — ${matchingEvalDataset.jobs.length} jobs, ${matchingEvalDataset.candidates.length} candidates, ${matchingEvalDataset.labels.length} labeled pairs\n`,
  );
  printTable(allResults);
  for (const r of allResults) printFailures(r);

  const hybrid = MATCHERS.find((m) => m.id === "hybrid-v1");
  if (hybrid) sweepHybridThreshold(hybrid);

  const payload = {
    generatedAt: new Date().toISOString(),
    datasetVersion: matchingEvalDataset.version,
    queueThreshold: 0.28,
    matchers: allResults,
  };

  const jsonPath = join(outDir, "latest.json");
  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${jsonPath}`);
}

main();
