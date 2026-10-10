/**
 * Regenerate isolated test dataset (~150 jobs, ~150 synthetic candidates), run matching, persist.
 * Usage: DATABASE_URL=... npm run seed:test-sandbox
 * Optional: SANDBOX_JOB_URLS=comma-separated public career page URLs (fetched as plain text; no LinkedIn).
 */
import { runSandboxMatching } from "../src/application/test-sandbox/run-matching";
import {
  assertSandboxIsolation,
  buildSandboxStore,
} from "../eval/test-sandbox/generate-dataset";
import { deleteTestDataset, persistTestSandboxStore } from "../src/infrastructure/db/test-sandbox-db";
import { loadMatchingEmbeddingIndex } from "../src/infrastructure/db/card-embeddings";
import { readNormalizedStore } from "../src/infrastructure/db/normalized-store";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required for seed:test-sandbox");
    process.exit(1);
  }
  console.log("Deleting previous sandbox rows…");
  await deleteTestDataset();
  let store = buildSandboxStore();
  assertSandboxIsolation(store);
  console.log(
    `Generated ${store.employers.reduce((n, e) => n + e.jobs.length, 0)} jobs, ${store.employees.length} candidates`,
  );
  const full = await readNormalizedStore();
  store = {
    ...store,
    adminSettings: full.adminSettings,
  };
  const index = await loadMatchingEmbeddingIndex(store);
  const { store: matched, stats } = runSandboxMatching(store, index);
  console.log(
    `Matching: ${stats.newlyQueued} queued / ${stats.pairsConsidered} pairs (${stats.degradedToRule} rule fallback) in ${stats.durationMs}ms`,
  );
  await persistTestSandboxStore(matched);
  console.log("Sandbox dataset persisted.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
