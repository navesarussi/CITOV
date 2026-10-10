import { getPool } from "./pool";
import { NORMALIZED_SCHEMA_SQL } from "./schema-sql";
import { isNormalizedDataCached, markNormalizedDataPresent } from "./store-cache";
import { logDbTiming, startDbTimer } from "./db-timing";

const MIGRATION_VERSION = "006_match_labels";

const ALTERS = `
create extension if not exists vector;

create table if not exists card_embedding_segments (
  id text primary key,
  owner_kind text not null check (owner_kind in ('candidate', 'job')),
  owner_id text not null,
  job_slot_id text,
  segment text not null check (segment in ('role', 'skills', 'profile')),
  model text not null,
  content_hash text not null,
  embedded_text text not null,
  embedding vector(768) not null,
  updated_at timestamptz not null default now(),
  unique (owner_kind, owner_id, job_slot_id, segment, model)
);
create index if not exists card_embedding_segments_owner_idx
  on card_embedding_segments (owner_kind, owner_id, job_slot_id);

alter table employer_profiles add column if not exists jobs jsonb not null default '[]'::jsonb;
alter table employer_profiles add column if not exists active_job_id text;
alter table matches add column if not exists job_id text;
update matches set job_id = job_owner_id where job_id is null;

alter table chat_messages add column if not exists conversation_context text;
alter table chat_messages add column if not exists job_id text;

update chat_messages m
set conversation_context = 'employee'
from employee_profiles e
where m.owner_user_id = e.user_id
  and m.conversation_context is null
  and not exists (select 1 from employer_profiles p where p.user_id = m.owner_user_id);

update chat_messages m
set conversation_context = 'employer',
    job_id = coalesce(p.active_job_id, p.user_id)
from employer_profiles p
where m.owner_user_id = p.user_id
  and m.conversation_context is null
  and not exists (select 1 from employee_profiles e where e.user_id = m.owner_user_id);

update chat_messages set conversation_context = 'employee' where conversation_context is null;

alter table chat_messages alter column conversation_context set default 'employee';
alter table chat_messages alter column conversation_context set not null;

create index if not exists chat_messages_context_idx
  on chat_messages (owner_user_id, conversation_context, job_id, created_at);

alter table employee_profiles add column if not exists cv jsonb not null default '{}'::jsonb;

alter table admin_settings add column if not exists prompt_bundle_version text;

create table if not exists candidate_document_blobs (
  id text primary key,
  user_id text not null references app_users (id) on delete cascade,
  content bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists candidate_document_blobs_user_idx on candidate_document_blobs (user_id);

create table if not exists match_labels (
  id text primary key,
  job_id text not null,
  candidate_id text not null,
  label text not null check (label in ('good', 'acceptable', 'bad')),
  note text,
  source text not null check (source in ('admin', 'employer_action', 'import')),
  labeler_user_id text not null default '',
  rule_score double precision,
  hybrid_score double precision,
  matcher_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists match_labels_pair_idx on match_labels (job_id, candidate_id);
create index if not exists match_labels_source_idx on match_labels (source, updated_at desc);
create unique index if not exists match_labels_unique_admin
  on match_labels (job_id, candidate_id, source, labeler_user_id);
`;

let schemaReady: Promise<void> | undefined;

async function schemaAlreadyCurrent(pool: Awaited<ReturnType<typeof getPool>>): Promise<boolean> {
  try {
    const r = await pool.query<{ ok: boolean }>(`
      select (
        to_regclass('public.app_users') is not null
        and to_regclass('public.match_labels') is not null
        and exists (
          select 1 from schema_migrations
          where version in ('005_card_embeddings', '006_match_labels')
        )
      ) as ok
    `);
    return Boolean(r.rows[0]?.ok);
  } catch {
    return false;
  }
}

async function runSchema(): Promise<void> {
  const elapsed = startDbTimer();
  const pool = await getPool();
  if (await schemaAlreadyCurrent(pool)) {
    logDbTiming("ensureSchema skipped (current)", elapsed());
    await pool.query(
      `insert into schema_migrations (version) values ($1) on conflict (version) do nothing`,
      [MIGRATION_VERSION],
    );
    return;
  }
  await pool.query(NORMALIZED_SCHEMA_SQL);
  await pool.query(ALTERS);
  await pool.query(
    `insert into schema_migrations (version) values ($1) on conflict (version) do nothing`,
    ["005_card_embeddings"],
  );
  await pool.query(
    `insert into schema_migrations (version) values ($1) on conflict (version) do nothing`,
    [MIGRATION_VERSION],
  );
  logDbTiming("ensureSchema applied DDL", elapsed());
}

/**
 * Run the schema DDL + migrations exactly once per process. Previously this ran
 * on every read and write — including a table-wide `update matches` — adding
 * several round-trips (and a write) to every single request.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = runSchema().catch((err) => {
      schemaReady = undefined; // allow a retry on the next call if bootstrap failed
      throw err;
    });
  }
  return schemaReady;
}

export async function hasNormalizedData(): Promise<boolean> {
  if (isNormalizedDataCached()) return true;
  const pool = await getPool();
  const result = await pool.query<{ count: string }>(
    `select count(*)::text as count from app_users`,
  );
  const present = Number(result.rows[0]?.count ?? 0) > 0;
  if (present) markNormalizedDataPresent();
  return present;
}
