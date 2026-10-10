/**
 * הרצת שופטים על זוגות test-run: סיווג דילוג/תור בעלים, שמירה נפרדת ממקורות אנוש.
 * SANDBOX_JUDGE_BATCH_SIZE=6 — התאמה ל-timeout ב-Vercel.
 */
import {
  LLM_JUDGE_AUDIT_SAMPLE_RATE,
  LLM_JUDGE_HIGH_CONFIDENCE,
  judgesAgree,
  mapEngineDisagreement,
  type LlmJudgePairRecord,
} from "@/domain/llm-judge";
import { readQueueThreshold } from "@/application/matching-config";
import { scoreMatch } from "@/domain/matching";
import { scoreCandidateForJob, type MatchEmbeddingIndex } from "@/application/match-scoring";
import type { StoreData } from "@/domain/types";
import { runTwoJudgeBatch, type JudgeBatchPair } from "@/infrastructure/ai/match-llm-judge";
import {
  deleteSandboxLlmJudgments,
  upsertSandboxLlmJudgmentsBatch,
} from "@/infrastructure/db/sandbox-llm-judgments";
import { upsertMatchLabel } from "@/infrastructure/db/match-labels";
import { buildAiUsageRecord, insertAiUsageRecord } from "@/infrastructure/db/ai-usage";
import { createHash } from "crypto";

export const SANDBOX_JUDGE_BATCH_SIZE = 6;

function stableAuditSample(jobId: string, candidateId: string): boolean {
  const h = createHash("sha256").update(`${jobId}:${candidateId}`).digest();
  const bucket = h[0]! / 255;
  return bucket < LLM_JUDGE_AUDIT_SAMPLE_RATE;
}

function classifyPair(params: {
  judgeA: LlmJudgePairRecord["judgeA"];
  judgeB: LlmJudgePairRecord["judgeB"];
  engineQueued: boolean;
  jobId: string;
  candidateId: string;
}): Pick<LlmJudgePairRecord, "judgesAgree" | "autoSkipped" | "auditSample" | "needsOwner"> {
  const agree = judgesAgree(params.judgeA.label, params.judgeB.label);
  const highConf =
    agree &&
    params.judgeA.confidence >= LLM_JUDGE_HIGH_CONFIDENCE &&
    params.judgeB.confidence >= LLM_JUDGE_HIGH_CONFIDENCE;
  const engineConflict = mapEngineDisagreement({
    judgesAgree: agree,
    agreedLabel: agree ? params.judgeA.label : null,
    engineQueued: params.engineQueued,
  });
  const lowConf =
    params.judgeA.confidence < LLM_JUDGE_HIGH_CONFIDENCE ||
    params.judgeB.confidence < LLM_JUDGE_HIGH_CONFIDENCE;
  const auditSample = highConf && stableAuditSample(params.jobId, params.candidateId);
  const autoSkipped = highConf && !engineConflict && !auditSample;
  const needsOwner = !autoSkipped || auditSample;
  return {
    judgesAgree: agree,
    autoSkipped,
    auditSample,
    needsOwner: needsOwner || !agree || lowConf || engineConflict,
  };
}

export type SandboxJudgeProgress = {
  judgedCount: number;
  totalQueued: number;
  done: boolean;
};

export function listSandboxPairsToJudge(store: StoreData): { jobId: string; candidateId: string }[] {
  const queued = store.matches.filter((m) => m.isTest && m.status === "queued");
  return queued.map((m) => ({ jobId: m.jobId, candidateId: m.candidateId }));
}

export async function runSandboxLlmJudgeChunk(params: {
  store: StoreData;
  index: MatchEmbeddingIndex | undefined;
  offset: number;
  limit?: number;
  reset?: boolean;
}): Promise<SandboxJudgeProgress & { batchCostUsd?: number }> {
  if (params.reset) await deleteSandboxLlmJudgments();
  const pairs = listSandboxPairsToJudge(params.store);
  const slice = pairs.slice(params.offset, params.offset + (params.limit ?? SANDBOX_JUDGE_BATCH_SIZE));
  const threshold = readQueueThreshold(params.store.adminSettings);
  const batchPairs: JudgeBatchPair[] = [];
  for (let i = 0; i < slice.length; i++) {
    const { jobId, candidateId } = slice[i]!;
    const emp = params.store.employees.find((e) => e.userId === candidateId);
    const job = params.store.employers.flatMap((e) => e.jobs).find((j) => j.id === jobId);
    if (!emp || !job) continue;
    batchPairs.push({
      pairIndex: i,
      jobId,
      candidateId,
      job: job.card,
      candidate: emp.card,
    });
  }

  const { judgeA, judgeB, usage } = await runTwoJudgeBatch(batchPairs);
  const records: LlmJudgePairRecord[] = [];
  for (const bp of batchPairs) {
    const a = judgeA.get(bp.pairIndex);
    const b = judgeB.get(bp.pairIndex);
    if (!a || !b) continue;
    const match = params.store.matches.find(
      (m) => m.jobId === bp.jobId && m.candidateId === bp.candidateId,
    );
    const ruleScore = scoreMatch(bp.candidate, bp.job);
    const hybridScore = scoreCandidateForJob({
      candidate: bp.candidate,
      job: bp.job,
      candidateId: bp.candidateId,
      jobId: bp.jobId,
      index: params.index,
      mode: "hybrid",
    }).score;
    const engineQueued = (match?.score ?? hybridScore) >= threshold;
    const flags = classifyPair({
      judgeA: a,
      judgeB: b,
      engineQueued,
      jobId: bp.jobId,
      candidateId: bp.candidateId,
    });
    records.push({
      jobId: bp.jobId,
      candidateId: bp.candidateId,
      judgeA: a,
      judgeB: b,
      engineScore: match?.score ?? hybridScore,
      ruleScore,
      hybridScore,
      engineQueued,
      ...flags,
    });
  }

  await upsertSandboxLlmJudgmentsBatch(records);
  for (const r of records) {
    await upsertMatchLabel({
      jobId: r.jobId,
      candidateId: r.candidateId,
      label: r.judgeA.label,
      note: JSON.stringify({ reasonHe: r.judgeA.reasonHe, confidence: r.judgeA.confidence }),
      source: "llm-judge-a",
      labelerUserId: "system",
    });
    await upsertMatchLabel({
      jobId: r.jobId,
      candidateId: r.candidateId,
      label: r.judgeB.label,
      note: JSON.stringify({
        reasonHe: r.judgeB.reasonHe,
        critiqueHe: r.judgeB.critiqueHe,
        confidence: r.judgeB.confidence,
      }),
      source: "llm-judge-b",
      labelerUserId: "system",
    });
  }

  let batchCostUsd = 0;
  for (const u of usage) {
    const rec = buildAiUsageRecord({ type: "llm_judge", usage: u, model: process.env.GEMINI_MODEL });
    if (!rec) continue;
    batchCostUsd += rec.estimatedCostUsd;
    await insertAiUsageRecord(rec);
  }

  const nextOffset = params.offset + slice.length;
  return {
    judgedCount: nextOffset,
    totalQueued: pairs.length,
    done: nextOffset >= pairs.length,
    batchCostUsd,
  };
}
