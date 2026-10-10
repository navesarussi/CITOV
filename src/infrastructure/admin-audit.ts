import { shouldUseMemoryStore } from "@/infrastructure/db/memory-store";
import { ensureSchema } from "@/infrastructure/db/schema";
import { getPool } from "@/infrastructure/db/pool";
import { randomUUID } from "crypto";

export type AdminAuditEntry = {
  actorEmail: string;
  action: string;
  meta?: Record<string, unknown>;
};

export async function recordAdminAudit(entry: AdminAuditEntry): Promise<void> {
  const actor = entry.actorEmail.trim().slice(0, 320);
  const action = entry.action.trim().slice(0, 120);
  if (!actor || !action) return;

  if (shouldUseMemoryStore()) {
    console.info("[admin-audit]", { actor, action, meta: entry.meta });
    return;
  }

  await ensureSchema();
  const pool = await getPool();
  await pool.query(
    `insert into admin_audit_log (id, actor_email, action, meta, created_at)
     values ($1, $2, $3, $4, now())`,
    [randomUUID(), actor, action, entry.meta ? JSON.stringify(entry.meta) : null],
  );
}
