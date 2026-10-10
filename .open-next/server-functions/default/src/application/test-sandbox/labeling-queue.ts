import { getLabelingPair, type LabelingPair } from "@/application/admin-labeling";
import { readQueueThreshold } from "@/application/matching-config";
import { scoreMatch } from "@/domain/matching";
import { LLM_JUDGE_HIGH_CONFIDENCE } from "@/domain/llm-judge";
import { scoreCandidateForJob, type MatchEmbeddingIndex } from "@/application/match-scoring";
import type { StoreData } from "@/domain/types";
import { labeledPairKeys } from "@/infrastructure/db/match-labels";
import { listSandboxLlmJudgments } from "@/infrastructure/db/sandbox-llm-judgments";
import { sandboxHoldoutPairKeys } from "../../../eval/test-sandbox/generate-dataset";

export type UncertaintyRankedPair = {
  jobId: string;
  candidateId: string;
  score: number;
  uncertainty: number;
  judge?: Awaited<ReturnType<typeof listSandboxLlmJudgments>>[number];
};

export function rankSandboxPairsForLabeling(
  store: StoreData,
  index: MatchEmbeddingIndex | undefined,
  judgments: Awaited<ReturnType<typeof listSandboxLlmJudgments>>,
): UncertaintyRankedPair[] {
  const threshold = readQueueThreshold(store.adminSettings);
  const judgmentByKey = new Map(judgments.map((j) => [`${j.jobId}:${j.candidateId}`, j]));
  const queued = store.matches.filter((m) => m.isTest && m.status === "queued");
  const holdout = sandboxHoldoutPairKeys();
  const out: UncertaintyRankedPair[] = [];

  for (const m of queued) {
    const key = `${m.jobId}:${m.candidateId}`;
    if (holdout.has(key)) continue;
    const judge = judgmentByKey.get(key);
    if (judge?.autoSkipped && !judge.auditSample) continue;

    const emp = store.employees.find((e) => e.userId === m.candidateId);
    const job = store.employers.flatMap((e) => e.jobs).find((j) => j.id === m.jobId);
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
    let uncertainty = nearThreshold * 0.45 + disagreement * 0.35;

    if (judge) {
      if (!judge.judgesAgree) uncertainty += 0.35;
      if (judge.judgeA.confidence < LLM_JUDGE_HIGH_CONFIDENCE) uncertainty += 0.15;
      if (judge.judgeB.confidence < LLM_JUDGE_HIGH_CONFIDENCE) uncertainty += 0.15;
      if (judge.auditSample) uncertainty += 0.25;
      const positive =
        judge.judgeA.label === "good" || judge.judgeA.label === "acceptable";
      if (judge.engineQueued !== positive) uncertainty += 0.2;
    } else {
      uncertainty += 0.1;
    }

    out.push({
      jobId: m.jobId,
      candidateId: m.candidateId,
      score: m.score,
      uncertainty,
      judge,
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
  const labeled = await labeledPairKeys(true);
  const judgments = await listSandboxLlmJudgments();
  const ranked = rankSandboxPairsForLabeling(store, index, judgments);
  const out: LabelingPair[] = [];
  for (const row of ranked) {
    if (out.length >= limit) break;
    const key = `${row.jobId}:${row.candidateId}`;
    if (labeled.has(key)) continue;
    const rich = getLabelingPair(store, row.jobId, row.candidateId, index, "test-run");
    if (rich) {
      (rich as LabelingPair & { llmJudge?: typeof row.judge }).llmJudge = row.judge;
      out.push(rich);
    }
  }
  return out;
}
