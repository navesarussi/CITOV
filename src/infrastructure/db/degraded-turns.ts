import { randomUUID } from "crypto";
import { shouldUseMemoryStore } from "./memory-store";
import { ensureSchema } from "./schema";
import { getPool } from "./pool";

export type DegradedTurnRow = {
  id: string;
  userId: string;
  role: "employee" | "employer";
  jobId: string | null;
  userMessage: string;
  heuristicReply: string;
  status: "pending" | "recovered" | "failed";
  createdAt: string;
  recoveredAt: string | null;
};

const memory: DegradedTurnRow[] = [];

export async function enqueueDegradedTurn(params: {
  userId: string;
  role: "employee" | "employer";
  jobId?: string;
  userMessage: string;
  heuristicReply: string;
}): Promise<DegradedTurnRow> {
  const row: DegradedTurnRow = {
    id: randomUUID(),
    userId: params.userId,
    role: params.role,
    jobId: params.jobId ?? null,
    userMessage: params.userMessage,
    heuristicReply: params.heuristicReply,
    status: "pending",
    createdAt: new Date().toISOString(),
    recoveredAt: null,
  };
  if (shouldUseMemoryStore()) {
    memory.unshift(row);
    return row;
  }
  await ensureSchema();
  const pool = await getPool();
  await pool.query(
    `insert into degraded_turns (id, user_id, role, job_id, user_message, heuristic_reply, status, created_at)
     values ($1,$2,$3,$4,$5,$6,'pending', now())`,
    [row.id, row.userId, row.role, row.jobId, row.userMessage, row.heuristicReply],
  );
  return row;
}

export async function listPendingDegradedTurns(limit = 20): Promise<DegradedTurnRow[]> {
  if (shouldUseMemoryStore()) {
    return memory.filter((r) => r.status === "pending").slice(0, limit);
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{
    id: string;
    user_id: string;
    role: "employee" | "employer";
    job_id: string | null;
    user_message: string;
    heuristic_reply: string;
    status: DegradedTurnRow["status"];
    created_at: Date;
    recovered_at: Date | null;
  }>(
    `select id, user_id, role, job_id, user_message, heuristic_reply, status, created_at, recovered_at
     from degraded_turns where status = 'pending' order by created_at asc limit $1`,
    [limit],
  );
  return r.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    role: row.role,
    jobId: row.job_id,
    userMessage: row.user_message,
    heuristicReply: row.heuristic_reply,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    recoveredAt: row.recovered_at?.toISOString() ?? null,
  }));
}

export async function markDegradedTurn(
  id: string,
  status: "recovered" | "failed",
): Promise<void> {
  if (shouldUseMemoryStore()) {
    const hit = memory.find((m) => m.id === id);
    if (hit) {
      hit.status = status;
      hit.recoveredAt = new Date().toISOString();
    }
    return;
  }
  await ensureSchema();
  const pool = await getPool();
  await pool.query(
    `update degraded_turns set status = $2, recovered_at = now() where id = $1`,
    [id, status],
  );
}
