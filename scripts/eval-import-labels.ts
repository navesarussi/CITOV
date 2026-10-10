import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { matchingEvalDataset } from "../eval/matching/dataset";
import type { HoldoutLabelsFile } from "../eval/matching/load-holdout-labels";
import { parseLabelCsv, rowsToEvalLabels } from "../eval/matching/parse-label-csv";

const HOLDOUT_PATH = join(process.cwd(), "eval/matching/holdout-labels.json");

function trainPairKeys(): Set<string> {
  return new Set(
    matchingEvalDataset.labels.map((l) => `${l.jobId}__${l.candidateId}`),
  );
}

function main(): void {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run eval:import-labels -- <labeled.csv|json>");
    process.exit(1);
  }
  const abs = join(process.cwd(), file);
  const raw = readFileSync(abs, "utf8");
  let labels = rowsToEvalLabels([]);

  if (file.endsWith(".json")) {
    const j = JSON.parse(raw) as { pairs?: { job_id: string; candidate_id: string; label?: string; note?: string }[]; labels?: HoldoutLabelsFile["labels"] };
    if (j.labels?.length) {
      labels = j.labels.filter((l) => l.label).map((l) => ({
        jobId: l.jobId,
        candidateId: l.candidateId,
        label: l.label,
        reason: l.reason,
      }));
    } else if (j.pairs?.length) {
      labels = rowsToEvalLabels(
        j.pairs.map((p) => ({
          job_id: p.job_id,
          candidate_id: p.candidate_id,
          label: (p.label ?? "").trim().toLowerCase(),
          note: (p.note ?? "").trim(),
        })),
      );
    }
  } else {
    const { rows, errors } = parseLabelCsv(raw);
    if (errors.length) {
      console.error(errors.join("\n"));
      process.exit(1);
    }
    labels = rowsToEvalLabels(rows);
  }

  if (!labels.length) {
    console.error("No labeled rows (good/acceptable/bad) found in file.");
    process.exit(1);
  }

  const train = trainPairKeys();
  const overlap = labels.filter((l) => train.has(`${l.jobId}__${l.candidateId}`));
  if (overlap.length) {
    console.error(
      `Refusing import: ${overlap.length} pair(s) overlap train set (e.g. ${overlap[0].jobId}/${overlap[0].candidateId})`,
    );
    process.exit(1);
  }

  const payload: HoldoutLabelsFile = {
    version: "holdout-v1",
    description: `Imported from ${file} at ${new Date().toISOString()}`,
    labels: labels.map((l) => ({
      jobId: l.jobId,
      candidateId: l.candidateId,
      label: l.label,
      reason: l.reason,
    })),
  };
  writeFileSync(HOLDOUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${labels.length} holdout labels to ${HOLDOUT_PATH}`);
}

main();
