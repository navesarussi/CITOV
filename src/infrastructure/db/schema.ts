import { getPool } from "./pool";
import { NORMALIZED_SCHEMA_SQL } from "./schema-sql";
import { isNormalizedDataCached, markNormalizedDataPresent } from "./store-cache";
import { logDbTiming, startDbTimer } from "./db-timing";

const MIGRATION_VERSION = "015_sandbox_llm_judgments";

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
alter table matches add column if not exists score_breakdown jsonb;

alter table app_users add column if not exists employer_verified boolean not null default false;
update app_users set employer_verified = true where role = 'employer';
update app_users set employer_verified = true where id in ('demo-employer');

alter table app_users add column if not exists is_test boolean not null default false;
alter table app_users add column if not exists dataset_id text;
alter table matches add column if not exists is_test boolean not null default false;
alter table matches add column if not exists dataset_id text;

alter table app_users drop constraint if exists app_users_test_dataset_chk;
alter table app_users add constraint app_users_test_dataset_chk
  check ((is_test = false and dataset_id is null) or (is_test = true and dataset_id is not null));

alter table matches drop constraint if exists matches_test_dataset_chk;
alter table matches add constraint matches_test_dataset_chk
  check ((is_test = false and dataset_id is null) or (is_test = true and dataset_id is not null));

create index if not exists app_users_test_idx on app_users (is_test, dataset_id);
create index if not exists matches_test_idx on matches (is_test, dataset_id);

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
alter table admin_settings add column if not exists match_queue_threshold double precision;

create table if not exists candidate_document_blobs (
  id text primary key,
  user_id text not null references app_users (id) on delete cascade,
  content bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists candidate_document_blobs_user_idx on candidate_document_blobs (user_id);

alter table ai_usage add column if not exists cached_prompt_tokens integer not null default 0;
alter table ai_usage add column if not exists thinking_tokens integer not null default 0;
alter table ai_usage add column if not exists user_id text references app_users (id) on delete set null;
alter table ai_usage add column if not exists model text;
alter table ai_usage add column if not exists latency_ms integer;
create index if not exists ai_usage_created_at_idx on ai_usage (created_at desc);
create index if not exists ai_usage_user_id_idx on ai_usage (user_id, created_at desc);

create table if not exists prompt_versions (
  id text primary key,
  prompt_key text not null,
  version integer not null,
  body text not null,
  created_by text,
  created_at timestamptz not null default now(),
  unique (prompt_key, version)
);
create index if not exists prompt_versions_key_idx on prompt_versions (prompt_key, version desc);

create table if not exists prompt_active (
  prompt_key text primary key,
  active_version integer not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists degraded_turns (
  id text primary key,
  user_id text not null,
  role text not null check (role in ('employee', 'employer')),
  job_id text,
  user_message text not null,
  heuristic_reply text not null,
  status text not null check (status in ('pending', 'recovered', 'failed')) default 'pending',
  created_at timestamptz not null default now(),
  recovered_at timestamptz
);
create index if not exists degraded_turns_pending_idx on degraded_turns (status, created_at);

create table if not exists match_labels (
  id text primary key,
  job_id text not null,
  candidate_id text not null,
  label text not null check (label in ('good', 'acceptable', 'bad')),
  note text,
  source text not null check (source in ('admin', 'employer_action', 'import', 'crowd')),
  labeler_role text,
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

alter table match_labels add column if not exists labeler_role text;
alter table match_labels drop constraint if exists match_labels_source_check;
alter table match_labels add constraint match_labels_source_check
  check (source in (
    'admin', 'employer_action', 'candidate_action', 'import', 'crowd', 'test-run',
    'llm-judge-a', 'llm-judge-b'
  ));

create table if not exists sandbox_llm_judgments (
  job_id text not null,
  candidate_id text not null,
  judge_a_label text not null check (judge_a_label in ('good', 'acceptable', 'bad')),
  judge_a_reason text not null,
  judge_a_confidence double precision not null,
  judge_b_label text not null check (judge_b_label in ('good', 'acceptable', 'bad')),
  judge_b_reason text not null,
  judge_b_critique text not null,
  judge_b_confidence double precision not null,
  judges_agree boolean not null,
  auto_skipped boolean not null,
  audit_sample boolean not null,
  needs_owner boolean not null,
  engine_score double precision not null,
  rule_score double precision not null,
  hybrid_score double precision not null,
  engine_queued boolean not null,
  updated_at timestamptz not null default now(),
  primary key (job_id, candidate_id)
);
create index if not exists sandbox_llm_judgments_owner_idx on sandbox_llm_judgments (needs_owner, audit_sample);

create table if not exists app_events (
  id text primary key,
  kind text not null,
  severity text not null default 'info' check (severity in ('info', 'warn', 'critical')),
  route text,
  status_code integer,
  message text not null,
  stack text,
  user_id text,
  user_email text,
  meta jsonb,
  duration_ms integer,
  fingerprint text not null,
  issue_status text not null default 'open' check (issue_status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
create index if not exists app_events_fingerprint_idx on app_events (fingerprint, created_at desc);
create index if not exists app_events_kind_idx on app_events (kind, created_at desc);
create index if not exists app_events_created_idx on app_events (created_at desc);
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
  const current = await schemaAlreadyCurrent(pool);
  if (!current) {
    await pool.query(NORMALIZED_SCHEMA_SQL);
    await pool.query(
      `insert into schema_migrations (version) values ($1) on conflict (version) do nothing`,
      ["005_card_embeddings"],
    );
  }
  // Idempotent patches — one statement at a time so a constraint failure does not skip column adds.
  for (const stmt of ALTERS.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await pool.query(stmt);
    } catch (e) {
      console.warn("ensureSchema alter skipped", stmt.slice(0, 80), e);
    }
  }
  await pool.query(
    `insert into schema_migrations (version) values ($1) on conflict (version) do nothing`,
    [MIGRATION_VERSION],
  );
  logDbTiming(current ? "ensureSchema alters" : "ensureSchema full DDL", elapsed());
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
