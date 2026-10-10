import { randomUUID } from "crypto";
import { getPromptDefinition } from "@/domain/prompt-registry";
import { defaultPromptBody } from "@/infrastructure/ai/prompt-defaults";
import { shouldUseMemoryStore } from "./memory-store";
import { ensureSchema } from "./schema";
import { getPool } from "./pool";

export type PromptVersionRow = {
  promptKey: string;
  version: number;
  body: string;
  createdAt: string;
  createdBy: string | null;
};

type MemoryState = {
  active: Map<string, { version: number; body: string; updatedAt: string; updatedBy: string | null }>;
  versions: PromptVersionRow[];
};

const memory: MemoryState = { active: new Map(), versions: [] };

export async function getActivePromptBody(promptKey: string): Promise<string | null> {
  if (shouldUseMemoryStore()) {
    return memory.active.get(promptKey)?.body ?? null;
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{ body: string }>(
    `select v.body from prompt_active a
     join prompt_versions v on v.prompt_key = a.prompt_key and v.version = a.active_version
     where a.prompt_key = $1`,
    [promptKey],
  );
  return r.rows[0]?.body ?? null;
}

export async function listPromptVersions(promptKey: string, limit = 20): Promise<PromptVersionRow[]> {
  if (shouldUseMemoryStore()) {
    return memory.versions.filter((v) => v.promptKey === promptKey).slice(0, limit);
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{
    prompt_key: string;
    version: number;
    body: string;
    created_at: Date;
    created_by: string | null;
  }>(
    `select prompt_key, version, body, created_at, created_by
     from prompt_versions where prompt_key = $1
     order by version desc limit $2`,
    [promptKey, limit],
  );
  return r.rows.map((row) => ({
    promptKey: row.prompt_key,
    version: row.version,
    body: row.body,
    createdAt: row.created_at.toISOString(),
    createdBy: row.created_by,
  }));
}

export async function savePromptVersion(params: {
  promptKey: string;
  body: string;
  createdBy: string;
}): Promise<PromptVersionRow> {
  if (!getPromptDefinition(params.promptKey)) {
    throw new Error("unknown prompt");
  }
  if (shouldUseMemoryStore()) {
    const prev = memory.versions.filter((v) => v.promptKey === params.promptKey);
    const version = (prev[0]?.version ?? 0) + 1;
    const row: PromptVersionRow = {
      promptKey: params.promptKey,
      version,
      body: params.body,
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy,
    };
    memory.versions.unshift(row);
    memory.active.set(params.promptKey, {
      version,
      body: params.body,
      updatedAt: row.createdAt,
      updatedBy: params.createdBy,
    });
    return row;
  }
  await ensureSchema();
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const maxR = await client.query<{ max: number | null }>(
      `select max(version)::int as max from prompt_versions where prompt_key = $1`,
      [params.promptKey],
    );
    const version = (maxR.rows[0]?.max ?? 0) + 1;
    const id = randomUUID();
    await client.query(
      `insert into prompt_versions (id, prompt_key, version, body, created_by, created_at)
       values ($1,$2,$3,$4,$5, now())`,
      [id, params.promptKey, version, params.body, params.createdBy],
    );
    await client.query(
      `insert into prompt_active (prompt_key, active_version, updated_at, updated_by)
       values ($1,$2, now(), $3)
       on conflict (prompt_key) do update set
         active_version = excluded.active_version,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
      [params.promptKey, version, params.createdBy],
    );
    await client.query("commit");
    return {
      promptKey: params.promptKey,
      version,
      body: params.body,
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy,
    };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function rollbackPromptVersion(params: {
  promptKey: string;
  version: number;
  rolledBackBy: string;
}): Promise<PromptVersionRow | null> {
  if (shouldUseMemoryStore()) {
    const hit = memory.versions.find(
      (v) => v.promptKey === params.promptKey && v.version === params.version,
    );
    if (!hit) return null;
    memory.active.set(params.promptKey, {
      version: hit.version,
      body: hit.body,
      updatedAt: new Date().toISOString(),
      updatedBy: params.rolledBackBy,
    });
    return hit;
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{ body: string }>(
    `select body from prompt_versions where prompt_key = $1 and version = $2`,
    [params.promptKey, params.version],
  );
  if (!r.rows[0]) return null;
  await pool.query(
    `insert into prompt_active (prompt_key, active_version, updated_at, updated_by)
     values ($1,$2, now(), $3)
     on conflict (prompt_key) do update set
       active_version = excluded.active_version,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
    [params.promptKey, params.version, params.rolledBackBy],
  );
  return {
    promptKey: params.promptKey,
    version: params.version,
    body: r.rows[0].body,
    createdAt: new Date().toISOString(),
    createdBy: params.rolledBackBy,
  };
}

export async function resolvePromptText(promptKey: string): Promise<string> {
  const active = await getActivePromptBody(promptKey);
  if (active?.trim()) return active;
  return defaultPromptBody(promptKey);
}

export type ActivePromptMeta = {
  version: number;
  updatedAt: string;
  updatedBy: string | null;
};

export async function getActivePromptMeta(promptKey: string): Promise<ActivePromptMeta | null> {
  if (shouldUseMemoryStore()) {
    const hit = memory.active.get(promptKey);
    if (!hit) return null;
    return {
      version: hit.version,
      updatedAt: hit.updatedAt,
      updatedBy: hit.updatedBy,
    };
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{
    active_version: number;
    updated_at: Date;
    updated_by: string | null;
  }>(
    `select active_version, updated_at, updated_by from prompt_active where prompt_key = $1`,
    [promptKey],
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    version: row.active_version,
    updatedAt: row.updated_at.toISOString(),
    updatedBy: row.updated_by,
  };
}
