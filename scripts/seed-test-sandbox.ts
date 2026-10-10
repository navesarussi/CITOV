/**
 * Regenerate sandbox + full 150×150 eval + persist report for admin דוח הרצה.
 * Usage: DATABASE_URL=... npm run seed:test-sandbox
 */
import { runSandboxSeedAndReport } from "../src/application/test-sandbox/pipeline";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required for seed:test-sandbox");
    process.exit(1);
  }
  const report = await runSandboxSeedAndReport();
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
