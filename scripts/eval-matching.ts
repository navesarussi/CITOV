import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  defaultRuleBasedMatcher,
  evaluateMatcherOnDataset,
  type MatcherEvalResult,
} from "../src/domain/matching-eval/evaluate";
import type { MatcherDefinition } from "../src/domain/matching-eval/types";
import { matchingEvalDataset } from "../eval/matching/dataset";
import { validateMatchingDataset } from "../eval/matching/validate-dataset";

/** Register additional matchers here for side-by-side comparison. */
const MATCHERS: MatcherDefinition[] = [defaultRuleBasedMatcher];

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
  console.log(`\n=== Worst jobs by nDCG@5 ===`);
  for (const j of r.worstJobs) {
    console.log(
      `  ${j.jobId} ${j.jobTitle}: nDCG@5=${j.ndcgAt5.toFixed(3)} R@5=${formatPct(j.recallAt5)} P@5=${formatPct(j.precisionAt5)}`,
    );
  }
  const topMissed = r.confusion.goodMissed.slice(0, 8);
  if (topMissed.length) {
    console.log(`\n=== Good matches below threshold (${r.threshold}) ===`);
    for (const m of topMissed) {
      console.log(
        `  ${m.jobTitle} ↔ ${m.desiredRole} score=${formatPct(m.score)} ${m.reason ?? ""}`,
      );
    }
  }
}

function main(): void {
  validateMatchingDataset(matchingEvalDataset);

  const outDir = join(process.cwd(), "eval/matching/results");
  mkdirSync(outDir, { recursive: true });

  const allResults: MatcherEvalResult[] = MATCHERS.map((m) =>
    evaluateMatcherOnDataset(matchingEvalDataset, m, 5),
  );

  console.log(
    `Matching eval — ${matchingEvalDataset.jobs.length} jobs, ${matchingEvalDataset.candidates.length} candidates, ${matchingEvalDataset.labels.length} labeled pairs\n`,
  );
  printTable(allResults);
  for (const r of allResults) printFailures(r);

  const payload = {
    generatedAt: new Date().toISOString(),
    datasetVersion: matchingEvalDataset.version,
    datasetCounts: {
      jobs: matchingEvalDataset.jobs.length,
      candidates: matchingEvalDataset.candidates.length,
      labels: matchingEvalDataset.labels.length,
    },
    matchers: allResults,
  };

  const jsonPath = join(outDir, "latest.json");
  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${jsonPath}`);
}

main();
