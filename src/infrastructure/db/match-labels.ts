import { randomUUID } from "crypto";
import type { RelevanceLabel } from "@/domain/matching-eval/types";
import { ensureSchema } from "./schema";
import { getPool } from "./pool";

export type MatchLabelSource = "admin" | "employer_action" | "import" | "crowd";

export type MatchLabelRow = {
  id: string;
  jobId: string;
  candidateId: string;
  label: RelevanceLabel;
  note: string | null;
  source: MatchLabelSource;
  labelerUserId: string | null;
  ruleScore: number | null;
  hybridScore: number | null;
  matcherVersion: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function upsertMatchLabel(params: {
  jobId: string;
  candidateId: string;
  label: RelevanceLabel;
  note?: string;
  source: MatchLabelSource;
  labelerUserId?: string | null;
  labelerRole?: string | null;
  ruleScore?: number | null;
  hybridScore?: number | null;
  matcherVersion?: string | null;
}): Promise<void> {
  await ensureSchema();
  const pool = await getPool();
  const id = randomUUID();
  await pool.query(
    `insert into match_labels
      (id, job_id, candidate_id, label, note, source, labeler_user_id, rule_score, hybrid_score, matcher_version, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
     on conflict (job_id, candidate_id, source, labeler_user_id)
     do update set
       label = excluded.label,
       note = excluded.note,
       rule_score = coalesce(excluded.rule_score, match_labels.rule_score),
       hybrid_score = coalesce(excluded.hybrid_score, match_labels.hybrid_score),
       matcher_version = coalesce(excluded.matcher_version, match_labels.matcher_version),
       updated_at = now()`,
    [
      id,
      params.jobId,
      params.candidateId,
      params.label,
      params.note?.trim() || null,
      params.source,
      params.labelerUserId ?? "",
      params.ruleScore ?? null,
      params.hybridScore ?? null,
      params.matcherVersion ?? null,
    ],
  );
}

export async function listMatchLabels(limit = 5000): Promise<MatchLabelRow[]> {
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{
    id: string;
    job_id: string;
    candidate_id: string;
    label: RelevanceLabel;
    note: string | null;
    source: MatchLabelSource;
    labeler_user_id: string | null;
    rule_score: number | null;
    hybrid_score: number | null;
    matcher_version: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `select * from match_labels order by updated_at desc limit $1`,
    [limit],
  );
  return r.rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    candidateId: row.candidate_id,
    label: row.label,
    note: row.note,
    source: row.source,
    labelerUserId: row.labeler_user_id,
    ruleScore: row.rule_score,
    hybridScore: row.hybrid_score,
    matcherVersion: row.matcher_version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function countMatchLabels(): Promise<number> {
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{ c: string }>(`select count(*)::text as c from match_labels`);
  return Number(r.rows[0]?.c ?? 0);
}

export async function labeledPairKeys(): Promise<Set<string>> {
  const rows = await listMatchLabels(10_000);
  return new Set(rows.map((r) => `${r.jobId}:${r.candidateId}`));
}
