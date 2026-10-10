import type { CandidateCard, JobCard } from "@/domain/types";
import {
  refreshCandidateEmbeddings,
  refreshJobEmbeddings,
} from "@/infrastructure/db/card-embeddings";

declare global {
  // eslint-disable-next-line no-var
  var __shidukhEmbeddingRefreshRunning: Promise<void> | undefined;
}

/**
 * Re-embed after card patches (not every chat message). Debounced coalescing
 * avoids duplicate Gemini calls when intake sends multiple patches quickly.
 */
export function scheduleCandidateEmbeddingRefresh(userId: string, card: CandidateCard): void {
  void enqueue(() => refreshCandidateEmbeddings(userId, card));
}

export function scheduleJobEmbeddingRefresh(
  employerId: string,
  jobSlotId: string,
  card: JobCard,
): void {
  void enqueue(() => refreshJobEmbeddings(employerId, jobSlotId, card));
}

async function enqueue(task: () => Promise<unknown>): Promise<void> {
  const run = async () => {
    try {
      await task();
    } catch (err) {
      console.error("card embedding refresh failed", err);
    }
  };
  if (global.__shidukhEmbeddingRefreshRunning) {
    await global.__shidukhEmbeddingRefreshRunning;
  }
  global.__shidukhEmbeddingRefreshRunning = run().finally(() => {
    global.__shidukhEmbeddingRefreshRunning = undefined;
  });
  await global.__shidukhEmbeddingRefreshRunning;
}
