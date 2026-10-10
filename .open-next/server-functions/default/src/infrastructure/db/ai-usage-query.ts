import type { AiUsageRecord } from "@/domain/types";
import { ensureSchema } from "./schema";
import { getPool } from "./pool";

export async function listAiUsageSince(sinceIso: string): Promise<AiUsageRecord[]> {
  if (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL?.trim()) {
    return [];
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{
    id: string;
    type: AiUsageRecord["type"];
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cached_prompt_tokens: number | null;
    estimated_cost_usd: number;
    created_at: Date;
  }>(
    `select id, type, prompt_tokens, completion_tokens, total_tokens,
            cached_prompt_tokens, estimated_cost_usd, created_at
     from ai_usage where created_at >= $1::timestamptz`,
    [sinceIso],
  );
  return r.rows.map((row) => ({
    id: row.id,
    type: row.type,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    cachedPromptTokens: row.cached_prompt_tokens ?? undefined,
    estimatedCostUsd: Number(row.estimated_cost_usd),
    createdAt: row.created_at.toISOString(),
  }));
}
