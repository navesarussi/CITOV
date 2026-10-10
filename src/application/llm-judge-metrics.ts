/**
 * מדדי שופטים ללוח תיוג — הסכמה א׳↔ב׳, תור בעלים, ביקורת אדם; לא מערבב עם תיוג אנושי.
 */
import { judgesAgree } from "@/domain/llm-judge";
import { isHumanMatchLabelSource, listMatchLabels } from "@/infrastructure/db/match-labels";
import {
  listSandboxLlmJudgments,
  sandboxLlmJudgeStats,
  type LlmJudgeStats,
} from "@/infrastructure/db/sandbox-llm-judgments";

export type LlmJudgeDashboardMetrics = LlmJudgeStats & {
  /** Human labels on audit-sample pairs vs judge A (null if none compared yet). */
  humanAuditAgreementRate: number | null;
  humanAuditCompared: number;
};

function pairKey(jobId: string, candidateId: string): string {
  return `${jobId}:${candidateId}`;
}

/** Latest human label per pair (admin / test-run / crowd — excludes llm-judge sources). */
async function latestHumanLabelsByPair(): Promise<Map<string, import("@/domain/matching-eval/types").RelevanceLabel>> {
  const rows = await listMatchLabels(10_000);
  const map = new Map<string, import("@/domain/matching-eval/types").RelevanceLabel>();
  for (const row of rows) {
    if (!isHumanMatchLabelSource(row.source)) continue;
    map.set(pairKey(row.jobId, row.candidateId), row.label);
  }
  return map;
}

export async function humanAuditAgreementWithJudgeA(): Promise<{
  compared: number;
  agree: number;
  rate: number | null;
}> {
  const [judgments, human] = await Promise.all([listSandboxLlmJudgments(), latestHumanLabelsByPair()]);
  let compared = 0;
  let agree = 0;
  for (const row of judgments) {
    if (!row.auditSample) continue;
    const label = human.get(pairKey(row.jobId, row.candidateId));
    if (!label) continue;
    compared += 1;
    if (judgesAgree(row.judgeA.label, label)) agree += 1;
  }
  return { compared, agree, rate: compared > 0 ? agree / compared : null };
}

export async function buildLlmJudgeDashboardMetrics(): Promise<LlmJudgeDashboardMetrics> {
  const [base, audit] = await Promise.all([sandboxLlmJudgeStats(), humanAuditAgreementWithJudgeA()]);
  return {
    ...base,
    humanAuditAgreementRate: audit.rate,
    humanAuditCompared: audit.compared,
  };
}
