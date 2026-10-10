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
import { PRODUCTION_MATCH_DEFAULTS } from "../eval/matching/eval-sweep";

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function printTable(results: MatcherEvalResult[]): void {
  const header = [
    "Matcher",
    "Thr",
    "P@5",
    "R@5",
    "MRR",
    "nDCG@5",
    "Good miss",
    "Acc miss",
    "Bad Q",
  ];
  const rows = results.map((r) => [
    r.matcherId,
    r.threshold.toFixed(2),
    formatPct(r.macroPrecisionAtK),
    formatPct(r.macroRecallAtK),
    r.mrr.toFixed(3),
    r.macroNdcgAtK.toFixed(3),
    String(r.confusion.goodMissed.length),
    String(r.confusion.acceptableMissed.length),
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

function thresholdSweep(matcher: MatcherDefinition): void {
  console.log(`\n=== Threshold sweep: ${matcher.id} (ranking fixed; queue confusion varies) ===`);
  let best = { t: 0.6, score: -Infinity, good: 999, bad: 999 };
  for (let ti = 10; ti <= 95; ti++) {
    const t = ti / 100;
    const r = evaluateMatcherOnDataset(matchingEvalDataset, matcher, 5, t);
    if (ti % 5 === 0) {
      console.log(
        `  t=${t.toFixed(2)} good_missed=${r.confusion.goodMissed.length} acc_missed=${r.confusion.acceptableMissed.length} bad_queued=${r.confusion.badQueued.length}`,
      );
    }
    const obj =
      r.macroNdcgAtK * 0.4 +
      r.macroRecallAtK * 0.35 -
      r.confusion.goodMissed.length * 0.08 -
      r.confusion.badQueued.length * 0.15;
    if (r.confusion.badQueued <= 1 && obj > best.score) {
      best = {
        t,
        score: obj,
        good: r.confusion.goodMissed.length,
        bad: r.confusion.badQueued.length,
      };
    }
  }
  console.log(
    `  suggested (bad_queued<=1): t≈${best.t.toFixed(2)} good_missed=${best.good} bad_queued=${best.bad}`,
  );
}

function buildMatchers(): { matchers: MatcherDefinition[]; thresholds: number[] } {
  const list: MatcherDefinition[] = [defaultRuleBasedMatcher];
  const thresholds = [0.28];
  const fixture = loadEvalEmbeddingFixture();
  if (fixture) {
    console.log(
      `Loaded embedding fixture: generator=${fixture.generator} model=${fixture.model} entities=${Object.keys(fixture.entities).length}`,
    );
    if (fixture.generator !== "gemini") {
      console.warn("WARNING: fixture is not from Gemini — metrics are not production-representative.");
    }
    list.push(...createEvalMatcherDefinitions(fixture));
    // rule @0.28; legacy semantic/hybrid @0.28; calibrated semantic @0.28; production hybrid @0.6
    while (thresholds.length < list.length) {
      const id = list[thresholds.length]?.id ?? "";
      thresholds.push(
        id === "hybrid-calibrated-v1" ? PRODUCTION_MATCH_DEFAULTS.queueThreshold : 0.28,
      );
    }
  } else {
    console.warn("No embedding fixture — semantic/hybrid matchers skipped.");
  }
  return { matchers: list, thresholds };
}

function main(): void {
  validateMatchingDataset(matchingEvalDataset);
  const { matchers, thresholds } = buildMatchers();

  const outDir = join(process.cwd(), "eval/matching/results");
  mkdirSync(outDir, { recursive: true });

  const allResults: MatcherEvalResult[] = matchers.map((m, i) =>
    evaluateMatcherOnDataset(matchingEvalDataset, m, 5, thresholds[i] ?? 0.28),
  );

  console.log(
    `\nMatching eval — ${matchingEvalDataset.jobs.length} jobs, ${matchingEvalDataset.candidates.length} candidates, ${matchingEvalDataset.labels.length} labeled pairs`,
  );
  console.log(
    `Production defaults: floor=${PRODUCTION_MATCH_DEFAULTS.cosineFloor} semantic/rule=${PRODUCTION_MATCH_DEFAULTS.semanticWeight}/${PRODUCTION_MATCH_DEFAULTS.ruleWeight} threshold=${PRODUCTION_MATCH_DEFAULTS.queueThreshold}`,
  );
  console.log(
    "\nNote: grid-tuned threshold/weights were chosen on this same labeled set (~90 pairs) — treat as optimistic; holdout is future work.\n",
  );
  printTable(allResults);

  const hybrid = matchers.find((m) => m.id === "hybrid-calibrated-v1");
  if (hybrid) thresholdSweep(hybrid);

  const payload = {
    generatedAt: new Date().toISOString(),
    datasetVersion: matchingEvalDataset.version,
    productionDefaults: PRODUCTION_MATCH_DEFAULTS,
    matchers: allResults,
  };

  writeFileSync(join(outDir, "latest.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${join(outDir, "latest.json")}`);
}

main();
