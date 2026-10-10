#!/usr/bin/env tsx
import { backfillMatchCanonicalOnStore } from "../src/application/match-canonical-backfill";
import { readNormalizedStore, writeNormalizedStore } from "../src/infrastructure/db/normalized-store";

async function main() {
  const store = await readNormalizedStore();
  const next = backfillMatchCanonicalOnStore(store);
  await writeNormalizedStore(next);
  console.log("matchCanonical backfill applied to employees/employers/jobs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
