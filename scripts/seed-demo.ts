import { runDemoSeed } from "../src/application/demo-seed";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required for seed:demo (refusing memory-only seed).");
    process.exit(1);
  }
  const result = await runDemoSeed();
  if (result.skipped) {
    console.log("Demo seed already applied (adminSettings.updatedBy marker). Skipping.");
    return;
  }
  console.log(`Seeded ${result.candidates} candidates and ${result.jobs} jobs (eval-cards-v1).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
