import type { EmployerRecord, JobCard } from "@/domain/types";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";

/** Resolve the job card for a match — never fall back to a different active job silently. */
export function jobCardForMatch(
  employer: EmployerRecord | undefined,
  jobId: string | undefined,
): JobCard | undefined {
  if (!employer) return undefined;
  const normalized = normalizeEmployerRecord(employer);
  if (jobId) {
    const slot = normalized.jobs.find((j) => j.id === jobId);
    if (slot) return slot.card;
  }
  return normalized.card;
}
