#!/usr/bin/env tsx
import { backfillMatchCanonicalOnStore } from "../src/application/match-canonical-backfill";
import { measureMatchCanonicalCoverage } from "../src/domain/matching-critical-fields";
import { readNormalizedStore, writeNormalizedStore } from "../src/infrastructure/db/normalized-store";

function pct(n: number, d: number): string {
  if (!d) return "n/a";
  return `${((100 * n) / d).toFixed(1)}%`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL required (read-only store load)");
    process.exit(1);
  }

  const beforeStore = await readNormalizedStore();
  const before = measureMatchCanonicalCoverage(beforeStore);
  console.log("## matchCanonical coverage (before)");
  console.log(
    `- Candidates: ${before.candidateWithCanonical}/${before.candidateCards} with any canonical (${pct(before.candidateWithCanonical, before.candidateCards)})`,
  );
  console.log(
    `- Critical complete candidates: ${before.candidateCriticalComplete}/${before.candidateCards} (${pct(before.candidateCriticalComplete, before.candidateCards)})`,
  );
  console.log(
    `- Job cards: ${before.jobWithCanonical}/${before.jobCards} with any canonical (${pct(before.jobWithCanonical, before.jobCards)})`,
  );
  console.log(
    `- Critical complete jobs: ${before.jobCriticalComplete}/${before.jobCards} (${pct(before.jobCriticalComplete, before.jobCards)})`,
  );

  if (!apply) {
    console.log("\nDry run — pass --apply to persist backfillMatchCanonicalOnStore");
    return;
  }

  const next = backfillMatchCanonicalOnStore(beforeStore);
  await writeNormalizedStore(next);
  const after = measureMatchCanonicalCoverage(next);
  console.log("\n## matchCanonical coverage (after backfill)");
  console.log(
    `- Critical complete candidates: ${after.candidateCriticalComplete}/${after.candidateCards} (${pct(after.candidateCriticalComplete, after.candidateCards)})`,
  );
  console.log(
    `- Critical complete jobs: ${after.jobCriticalComplete}/${after.jobCards} (${pct(after.jobCriticalComplete, after.jobCards)})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
