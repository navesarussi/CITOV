import { randomUUID } from "crypto";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import type { Match, StoreData } from "@/domain/types";
import { scoreCandidateForJob, type MatchEmbeddingIndex } from "./match-scoring";

export function rebuildMatches(
  store: StoreData,
  embeddingIndex?: MatchEmbeddingIndex,
): Match[] {
  const kept = store.matches.filter((m) => m.status !== "queued");
  const keptKeys = new Set(kept.map((m) => `${m.jobId ?? m.jobOwnerId}:${m.candidateId}`));
  const next: Match[] = kept.map((m) => ({
    ...m,
    jobId: m.jobId || m.jobOwnerId,
  }));

  for (const rawEmployer of store.employers) {
    const employer = normalizeEmployerRecord(rawEmployer);
    for (const job of employer.jobs) {
      if (!job.card.title && !job.card.field) continue;
      for (const employee of store.employees) {
        if (!employee.card.desiredRole && !employee.card.field) continue;
        const key = `${job.id}:${employee.userId}`;
        if (keptKeys.has(key)) continue;

        const scored = scoreCandidateForJob({
          candidate: employee.card,
          job: job.card,
          candidateId: employee.userId,
          jobId: job.id,
          index: embeddingIndex,
        });
        if (!scored.queued) continue;

        next.push({
          id: randomUUID(),
          jobOwnerId: employer.userId,
          jobId: job.id,
          candidateId: employee.userId,
          score: scored.score,
          reason: scored.reason,
          status: "queued",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return next.sort((a, b) => b.score - a.score);
}
