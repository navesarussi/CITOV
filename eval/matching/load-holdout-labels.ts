import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { EvalLabel, MatchingEvalDataset } from "../../src/domain/matching-eval/types";
import { buildDataset } from "./card-helpers";
import { seedCandidates } from "./seed-candidates";
import { seedJobs } from "./seed-jobs";

const HOLDOUT_PATH = join(process.cwd(), "eval/matching/holdout-labels.json");

export type HoldoutLabelsFile = {
  version: string;
  description?: string;
  labels: { jobId: string; candidateId: string; label: EvalLabel["label"]; reason?: string }[];
};

export function loadHoldoutLabelsFromDisk(): EvalLabel[] {
  if (!existsSync(HOLDOUT_PATH)) return [];
  const raw = JSON.parse(readFileSync(HOLDOUT_PATH, "utf8")) as HoldoutLabelsFile;
  if (!raw.labels?.length) return [];
  return raw.labels.map((l) => ({
    jobId: l.jobId,
    candidateId: l.candidateId,
    label: l.label,
    reason: l.reason,
  }));
}

export function buildHoldoutEvalDataset(): MatchingEvalDataset | null {
  const labels = loadHoldoutLabelsFromDisk();
  if (!labels.length) return null;
  return buildDataset(seedJobs, seedCandidates, labels);
}
