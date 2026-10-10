import type { RelevanceLabel } from "@/domain/matching-eval/types";
import { scoresForPair } from "@/application/admin-labeling";
import { upsertMatchLabel } from "@/infrastructure/db/match-labels";
import { loadMatchingEmbeddingIndex } from "@/infrastructure/db/card-embeddings";
import { readMatchingStore } from "@/infrastructure/store";

export async function recordEmployerMatchFeedback(params: {
  jobId: string;
  candidateId: string;
  employerId: string;
  status: "approved" | "rejected";
}): Promise<void> {
  const label: RelevanceLabel = params.status === "approved" ? "good" : "bad";
  const store = await readMatchingStore();
  const index = await loadMatchingEmbeddingIndex(store);
  const scores = scoresForPair(store, params.jobId, params.candidateId, index);
  await upsertMatchLabel({
    jobId: params.jobId,
    candidateId: params.candidateId,
    label,
    note: params.status === "approved" ? "employer approved" : "employer rejected",
    source: "employer_action",
    labelerUserId: params.employerId,
    ruleScore: scores.ruleScore,
    hybridScore: scores.hybridScore,
    matcherVersion: scores.matcherVersion,
  });
}
