import type { RelevanceLabel } from "@/domain/matching-eval/types";
import type { LlmJudgePairRecord } from "@/domain/llm-judge";
import { ensureSchema } from "./schema";
import { getPool } from "./pool";
import { shouldUseMemoryStore } from "./memory-store";

export type SandboxLlmJudgmentRow = LlmJudgePairRecord & {
  updatedAt: string;
};

const memory = new Map<string, SandboxLlmJudgmentRow>();

function key(jobId: string, candidateId: string): string {
  return `${jobId}:${candidateId}`;
}

export async function upsertSandboxLlmJudgment(row: LlmJudgePairRecord): Promise<void> {
  const updatedAt = new Date().toISOString();
  if (shouldUseMemoryStore()) {
    memory.set(key(row.jobId, row.candidateId), { ...row, updatedAt });
    return;
  }
  await ensureSchema();
  const pool = await getPool();
  await pool.query(
    `insert into sandbox_llm_judgments (
      job_id, candidate_id,
      judge_a_label, judge_a_reason, judge_a_confidence,
      judge_b_label, judge_b_reason, judge_b_critique, judge_b_confidence,
      judges_agree, auto_skipped, audit_sample, needs_owner,
      engine_score, rule_score, hybrid_score, engine_queued, updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now())
    on conflict (job_id, candidate_id) do update set
      judge_a_label = excluded.judge_a_label,
      judge_a_reason = excluded.judge_a_reason,
      judge_a_confidence = excluded.judge_a_confidence,
      judge_b_label = excluded.judge_b_label,
      judge_b_reason = excluded.judge_b_reason,
      judge_b_critique = excluded.judge_b_critique,
      judge_b_confidence = excluded.judge_b_confidence,
      judges_agree = excluded.judges_agree,
      auto_skipped = excluded.auto_skipped,
      audit_sample = excluded.audit_sample,
      needs_owner = excluded.needs_owner,
      engine_score = excluded.engine_score,
      rule_score = excluded.rule_score,
      hybrid_score = excluded.hybrid_score,
      engine_queued = excluded.engine_queued,
      updated_at = now()`,
    [
      row.jobId,
      row.candidateId,
      row.judgeA.label,
      row.judgeA.reasonHe,
      row.judgeA.confidence,
      row.judgeB.label,
      row.judgeB.reasonHe,
      row.judgeB.critiqueHe,
      row.judgeB.confidence,
      row.judgesAgree,
      row.autoSkipped,
      row.auditSample,
      row.needsOwner,
      row.engineScore,
      row.ruleScore,
      row.hybridScore,
      row.engineQueued,
    ],
  );
}

export async function upsertSandboxLlmJudgmentsBatch(rows: LlmJudgePairRecord[]): Promise<void> {
  for (const row of rows) {
    await upsertSandboxLlmJudgment(row);
  }
}

export async function getSandboxLlmJudgment(
  jobId: string,
  candidateId: string,
): Promise<SandboxLlmJudgmentRow | null> {
  if (shouldUseMemoryStore()) {
    return memory.get(key(jobId, candidateId)) ?? null;
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{
    job_id: string;
    candidate_id: string;
    judge_a_label: RelevanceLabel;
    judge_a_reason: string;
    judge_a_confidence: number;
    judge_b_label: RelevanceLabel;
    judge_b_reason: string;
    judge_b_critique: string;
    judge_b_confidence: number;
    judges_agree: boolean;
    auto_skipped: boolean;
    audit_sample: boolean;
    needs_owner: boolean;
    engine_score: number;
    rule_score: number;
    hybrid_score: number;
    engine_queued: boolean;
    updated_at: Date;
  }>(
    `select * from sandbox_llm_judgments where job_id = $1 and candidate_id = $2`,
    [jobId, candidateId],
  );
  const row = r.rows[0];
  if (!row) return null;
  return mapRow(row);
}

function mapRow(row: {
  job_id: string;
  candidate_id: string;
  judge_a_label: RelevanceLabel;
  judge_a_reason: string;
  judge_a_confidence: number;
  judge_b_label: RelevanceLabel;
  judge_b_reason: string;
  judge_b_critique: string;
  judge_b_confidence: number;
  judges_agree: boolean;
  auto_skipped: boolean;
  audit_sample: boolean;
  needs_owner: boolean;
  engine_score: number;
  rule_score: number;
  hybrid_score: number;
  engine_queued: boolean;
  updated_at: Date;
}): SandboxLlmJudgmentRow {
  return {
    jobId: row.job_id,
    candidateId: row.candidate_id,
    judgeA: {
      label: row.judge_a_label,
      reasonHe: row.judge_a_reason,
      confidence: row.judge_a_confidence,
    },
    judgeB: {
      label: row.judge_b_label,
      reasonHe: row.judge_b_reason,
      confidence: row.judge_b_confidence,
      critiqueHe: row.judge_b_critique,
    },
    judgesAgree: row.judges_agree,
    autoSkipped: row.auto_skipped,
    auditSample: row.audit_sample,
    needsOwner: row.needs_owner,
    engineScore: row.engine_score,
    ruleScore: row.rule_score,
    hybridScore: row.hybrid_score,
    engineQueued: row.engine_queued,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listSandboxLlmJudgments(limit = 50_000): Promise<SandboxLlmJudgmentRow[]> {
  if (shouldUseMemoryStore()) {
    return [...memory.values()].slice(0, limit);
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query(`select * from sandbox_llm_judgments order by updated_at desc limit $1`, [
    limit,
  ]);
  return r.rows.map((row) => mapRow(row as Parameters<typeof mapRow>[0]));
}

export async function countSandboxLlmJudgments(): Promise<number> {
  if (shouldUseMemoryStore()) return memory.size;
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{ c: string }>(`select count(*)::text as c from sandbox_llm_judgments`);
  return Number(r.rows[0]?.c ?? 0);
}

export async function deleteSandboxLlmJudgments(): Promise<void> {
  memory.clear();
  if (shouldUseMemoryStore()) return;
  await ensureSchema();
  const pool = await getPool();
  await pool.query(`delete from sandbox_llm_judgments`);
}

export type LlmJudgeStats = {
  total: number;
  autoSkipped: number;
  needsOwner: number;
  auditSample: number;
  judgeAgreementRate: number;
  judgeDisagreementCount: number;
  lowConfidenceCount: number;
};

export async function sandboxLlmJudgeStats(): Promise<LlmJudgeStats> {
  const rows = await listSandboxLlmJudgments();
  if (!rows.length) {
    return {
      total: 0,
      autoSkipped: 0,
      needsOwner: 0,
      auditSample: 0,
      judgeAgreementRate: 0,
      judgeDisagreementCount: 0,
      lowConfidenceCount: 0,
    };
  }
  let agree = 0;
  let lowConf = 0;
  for (const r of rows) {
    if (r.judgesAgree) agree += 1;
    if (r.judgeA.confidence < 0.85 || r.judgeB.confidence < 0.85) lowConf += 1;
  }
  const disagree = rows.length - agree;
  return {
    total: rows.length,
    autoSkipped: rows.filter((r) => r.autoSkipped).length,
    needsOwner: rows.filter((r) => r.needsOwner).length,
    auditSample: rows.filter((r) => r.auditSample).length,
    judgeAgreementRate: agree / rows.length,
    judgeDisagreementCount: disagree,
    lowConfidenceCount: lowConf,
  };
}
