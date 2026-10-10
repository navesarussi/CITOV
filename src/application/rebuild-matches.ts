import { randomUUID } from "crypto";
import { isDemoUserId } from "@/domain/admin";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import type { Match, StoreData } from "@/domain/types";
import { scoreCandidateForJob, type MatchEmbeddingIndex } from "./match-scoring";

export type MatchRebuildStats = {
  pairsConsidered: number;
  newlyQueued: number;
  degradedToRule: number;
  durationMs: number;
};

export function rebuildMatches(
  store: StoreData,
  embeddingIndex?: MatchEmbeddingIndex,
): { matches: Match[]; stats: MatchRebuildStats } {
  const started = Date.now();
  const kept = store.matches.filter((m) => m.status !== "queued");
  const keptKeys = new Set(kept.map((m) => `${m.jobId ?? m.jobOwnerId}:${m.candidateId}`));
  const next: Match[] = kept.map((m) => ({
    ...m,
    jobId: m.jobId || m.jobOwnerId,
  }));

  let pairsConsidered = 0;
  let newlyQueued = 0;
  let degradedToRule = 0;

  for (const rawEmployer of store.employers) {
    if (isDemoUserId(rawEmployer.userId)) continue;
    const employer = normalizeEmployerRecord(rawEmployer);
    for (const job of employer.jobs) {
      if (!job.card.title && !job.card.field) continue;
      for (const employee of store.employees) {
        if (isDemoUserId(employee.userId)) continue;
        if (!employee.card.desiredRole && !employee.card.field) continue;
        const key = `${job.id}:${employee.userId}`;
        if (keptKeys.has(key)) continue;
        pairsConsidered += 1;

        const scored = scoreCandidateForJob({
          candidate: employee.card,
          job: job.card,
          candidateId: employee.userId,
          jobId: job.id,
          index: embeddingIndex,
          adminSettings: store.adminSettings,
        });
        if (scored.degraded) degradedToRule += 1;
        if (!scored.queued) continue;
        newlyQueued += 1;

        next.push({
          id: randomUUID(),
          jobOwnerId: employer.userId,
          jobId: job.id,
          candidateId: employee.userId,
          score: scored.score,
          reason: scored.reason,
          scoreBreakdown: scored.scoreBreakdown,
          status: "queued",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return {
    matches: next.sort((a, b) => b.score - a.score),
    stats: {
      pairsConsidered,
      newlyQueued,
      degradedToRule,
      durationMs: Date.now() - started,
    },
  };
}
