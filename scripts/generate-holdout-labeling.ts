import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { matchingEvalDataset } from "../eval/matching/dataset";
import { rowsToCsv, selectHoldoutPairs, type HoldoutPairRow } from "../eval/matching/holdout-select";

const OUT_DIR = join(process.cwd(), "eval/matching/labeling");

function buildLabelHtml(pairs: HoldoutPairRow[]): string {
  const templatePath = join(OUT_DIR, "label.template.html");
  const template = readFileSync(templatePath, "utf8");
  return template.replace(
    "__HOLDOUT_PAIRS_JSON__",
    JSON.stringify(pairs).replace(/</g, "\\u003c"),
  );
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const rows = selectHoldoutPairs(
    matchingEvalDataset.jobs,
    matchingEvalDataset.candidates,
    matchingEvalDataset.labels,
    60,
  );
  writeFileSync(join(OUT_DIR, "holdout-v1.csv"), rowsToCsv(rows), "utf8");
  writeFileSync(join(OUT_DIR, "holdout-v1.pairs.json"), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  writeFileSync(join(OUT_DIR, "label.html"), buildLabelHtml(rows), "utf8");
  console.log(`Wrote ${rows.length} holdout pairs to ${OUT_DIR}/holdout-v1.csv and label.html`);
}

main();
