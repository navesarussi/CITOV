import { getLabelingPair, type LabelingPair } from "@/application/admin-labeling";
import { scoreMatch } from "@/domain/matching";
import { readQueueThreshold } from "@/application/matching-config";
import { scoreCandidateForJob, type MatchEmbeddingIndex } from "@/application/match-scoring";
import type { StoreData } from "@/domain/types";
import { labeledPairKeys } from "@/infrastructure/db/match-labels";
import { sandboxHoldoutPairKeys } from "../../../eval/test-sandbox/generate-dataset";

export type UncertaintyRankedPair = {
  jobId: string;
  candidateId: string;
  score: number;
  uncertainty: number;
};

export function rankSandboxPairsForLabeling(
  store: StoreData,
  index: MatchEmbeddingIndex | undefined,
): UncertaintyRankedPair[] {
  const threshold = readQueueThreshold(store.adminSettings);
  const queued = store.matches.filter((m) => m.isTest && m.status === "queued");
  const holdout = sandboxHoldoutPairKeys();
  const out: UncertaintyRankedPair[] = [];
  for (const m of queued) {
    const key = `${m.jobId}:${m.candidateId}`;
    if (holdout.has(key)) continue;
    const emp = store.employees.find((e) => e.userId === m.candidateId);
    const job = store.employers
      .flatMap((e) => e.jobs)
      .find((j) => j.id === m.jobId);
    if (!emp || !job) continue;
    const rule = scoreMatch(emp.card, job.card);
    const hybrid = scoreCandidateForJob({
      candidate: emp.card,
      job: job.card,
      candidateId: m.candidateId,
      jobId: m.jobId,
      index,
      mode: "hybrid",
    }).score;
    const nearThreshold = 1 - Math.abs(m.score - threshold);
    const disagreement = Math.abs(rule - hybrid);
    const uncertainty = nearThreshold * 0.55 + disagreement * 0.45;
    out.push({
      jobId: m.jobId,
      candidateId: m.candidateId,
      score: m.score,
      uncertainty,
    });
  }
  out.sort((a, b) => b.uncertainty - a.uncertainty);
  return out;
}

export async function nextTestRunLabelingPairs(
  store: StoreData,
  index: MatchEmbeddingIndex | undefined,
  limit = 1,
): Promise<LabelingPair[]> {
  const labeled = await labeledPairKeys();
  const ranked = rankSandboxPairsForLabeling(store, index);
  const out: LabelingPair[] = [];
  for (const row of ranked) {
    if (out.length >= limit) break;
    const key = `${row.jobId}:${row.candidateId}`;
    if (labeled.has(key)) continue;
    const rich = getLabelingPair(store, row.jobId, row.candidateId, index, "test-run");
    if (rich) out.push(rich);
  }
  return out;
}
