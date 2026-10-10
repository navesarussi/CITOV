import { candidatePatchSchema, jobPatchSchema } from "../../src/infrastructure/ai/schemas";
import type { MatchingEvalDataset } from "../../src/domain/matching-eval/types";

export function validateMatchingDataset(dataset: MatchingEvalDataset): void {
  const jobIds = new Set(dataset.jobs.map((j) => j.id));
  const candIds = new Set(dataset.candidates.map((c) => c.id));

  if (dataset.jobs.length < 20 || dataset.jobs.length > 35) {
    throw new Error(`Expected ~20-30 jobs, got ${dataset.jobs.length}`);
  }
  if (dataset.candidates.length < 40 || dataset.candidates.length > 65) {
    throw new Error(`Expected ~40-60 candidates, got ${dataset.candidates.length}`);
  }

  for (const j of dataset.jobs) {
    jobPatchSchema.parse(j.card);
    if (!j.card.title && !j.card.field) {
      throw new Error(`Job ${j.id} missing title and field`);
    }
  }
  for (const c of dataset.candidates) {
    candidatePatchSchema.parse(c.card);
  }
  for (const l of dataset.labels) {
    if (!jobIds.has(l.jobId)) throw new Error(`Unknown jobId in label: ${l.jobId}`);
    if (!candIds.has(l.candidateId)) {
      throw new Error(`Unknown candidateId in label: ${l.candidateId}`);
    }
  }
}
