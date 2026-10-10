import { randomUUID } from "crypto";
import { createAiUsageRecord } from "@/domain/admin";
import type { AiUsageRecord, AiUsageType } from "@/domain/types";
import type { AiTokenUsage } from "@/infrastructure/ai/schemas";
import { ensureSchema } from "./schema";
import { getPool } from "./pool";
import { shouldUseMemoryStore } from "./memory-store";

const memoryUsage: AiUsageRecord[] = [];

export type LogAiUsageInput = {
  type: AiUsageType;
  usage?: AiTokenUsage | null;
  userId?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  createdAt?: string;
};

export function buildAiUsageRecord(input: LogAiUsageInput): AiUsageRecord | undefined {
  if (!input.usage) return undefined;
  const { promptTokens, completionTokens, cachedPromptTokens, thinkingTokens } = input.usage;
  if (promptTokens === 0 && completionTokens === 0 && (thinkingTokens ?? 0) === 0) {
    return undefined;
  }
  return createAiUsageRecord({
    id: randomUUID(),
    type: input.type,
    promptTokens,
    completionTokens,
    cachedPromptTokens,
    thinkingTokens,
    createdAt: input.createdAt ?? new Date().toISOString(),
    userId: input.userId ?? undefined,
    model: input.model ?? undefined,
    latencyMs: input.latencyMs ?? undefined,
  });
}

export async function insertAiUsageRecord(record: AiUsageRecord): Promise<void> {
  if (shouldUseMemoryStore()) {
    memoryUsage.push(record);
    memoryUsage.splice(-500);
    return;
  }
  await ensureSchema();
  const pool = await getPool();
  await pool.query(
    `insert into ai_usage
       (id, type, prompt_tokens, completion_tokens, total_tokens, cached_prompt_tokens,
        thinking_tokens, estimated_cost_usd, user_id, model, latency_ms, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict (id) do nothing`,
    [
      record.id,
      record.type,
      record.promptTokens,
      record.completionTokens,
      record.totalTokens,
      record.cachedPromptTokens ?? 0,
      record.thinkingTokens ?? 0,
      record.estimatedCostUsd,
      record.userId ?? null,
      record.model ?? null,
      record.latencyMs ?? null,
      record.createdAt,
    ],
  );
}

export async function insertAiUsageRecords(records: AiUsageRecord[]): Promise<void> {
  for (const r of records) {
    await insertAiUsageRecord(r);
  }
}

/** Fire-and-forget — never throw to callers. */
export function logAiUsageSafe(input: LogAiUsageInput): void {
  const record = buildAiUsageRecord(input);
  if (!record) return;
  void insertAiUsageRecord(record).catch((err) => console.error("logAiUsage failed", err));
}

export type AiUsageRow = AiUsageRecord & {
  userName?: string | null;
};

export async function listAiUsageRows(sinceIso: string, limit = 5000): Promise<AiUsageRow[]> {
  if (shouldUseMemoryStore()) {
    return memoryUsage.filter((r) => r.createdAt >= sinceIso).slice(-limit);
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{
    id: string;
    type: AiUsageType;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cached_prompt_tokens: number | null;
    thinking_tokens: number | null;
    estimated_cost_usd: number;
    user_id: string | null;
    model: string | null;
    latency_ms: number | null;
    created_at: Date;
    user_name: string | null;
  }>(
    `select u.id, u.type, u.prompt_tokens, u.completion_tokens, u.total_tokens,
            u.cached_prompt_tokens, u.thinking_tokens, u.estimated_cost_usd,
            u.user_id, u.model, u.latency_ms, u.created_at,
            a.name as user_name
     from ai_usage u
     left join app_users a on a.id = u.user_id
     where u.created_at >= $1::timestamptz
     order by u.created_at desc
     limit $2`,
    [sinceIso, limit],
  );
  return r.rows.map((row) => ({
    id: row.id,
    type: row.type,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    cachedPromptTokens: row.cached_prompt_tokens ?? undefined,
    thinkingTokens: row.thinking_tokens ?? undefined,
    estimatedCostUsd: Number(row.estimated_cost_usd),
    userId: row.user_id ?? undefined,
    model: row.model ?? undefined,
    latencyMs: row.latency_ms ?? undefined,
    createdAt: row.created_at.toISOString(),
    userName: row.user_name,
  }));
}
