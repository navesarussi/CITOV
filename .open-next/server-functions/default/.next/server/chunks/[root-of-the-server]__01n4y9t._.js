module.exports=[794,(e,t,n)=>{t.exports=e.x("node:dns/promises",()=>require("node:dns/promises"))},23862,e=>e.a(async(t,n)=>{try{let t=await e.y("pg-587764f78a6c7a9c");e.n(t),n()}catch(e){n(e)}},!0),53047,e=>{"use strict";let t="aws-0",n=["aws-1","aws-0","aws-2","aws-3"],a=[6543,5432];function s(e){let t=e.trim(),n=t.match(/^(postgres(?:ql)?:\/\/)/i)?.[1];if(!n)throw Error("Invalid DATABASE_URL scheme");let a=t.slice(n.length),s=a.lastIndexOf("@");if(s<0)throw Error("Invalid DATABASE_URL credentials");let i=a.slice(0,s),o=a.slice(s+1),l=i.indexOf(":");if(l<0)throw Error("Invalid DATABASE_URL user");let r=decodeURIComponent(i.slice(0,l)),d=decodeURIComponent(i.slice(l+1)),[u,c="postgres"]=o.split("/"),[_,p="5432"]=u.split(":"),m=c.split("?")[0]||"postgres",x=_.match(/^db\.([^.]+)\.supabase\.co$/)?.[1]??r.match(/^postgres\.(.+)$/)?.[1]??null;return{user:r,password:d,host:_,port:p,database:m,ref:x}}function i(e){let t=encodeURIComponent(e.user),n=encodeURIComponent(e.password);return`postgresql://${t}:${n}@${e.host}:${e.port}/${e.database}`}e.s(["parseDatabaseUrl",0,s,"poolerConnectionCandidates",0,function(e){try{let o=s(e);if(!o.ref||o.host.includes("pooler.supabase.com"))return[e];let l=process.env.SUPABASE_POOLER_CLUSTER?.trim()||t;[...n.filter(e=>e!==l)];let r=process.env.SUPABASE_POOLER_REGION?.trim()||"ap-southeast-1",d=process.env.SUPABASE_POOLER_CLUSTER?.trim()||t,u=[];for(let e of a)u.push(i({user:`postgres.${o.ref}`,password:o.password,host:`${d}-${r}.pooler.supabase.com`,port:e,database:o.database}));return u.push(i({user:`postgres.${o.ref}`,password:o.password,host:`${"aws-0"===d?"aws-1":"aws-0"}-${r}.pooler.supabase.com`,port:6543,database:o.database})),[...new Set(u)]}catch{return[e]}}])},90185,e=>{"use strict";var t=e.i(53047);e.s(["appendPoolerQueryParams",0,function(e){let n=e.trim();if(n.includes("pgbouncer=true"))return n;try{let{port:e,host:a}=(0,t.parseDatabaseUrl)(n);if(!("6543"===e||a.includes("pooler.supabase.com")&&"5432"!==e))return n;let s=n.includes("?")?"&":"?";return`${n}${s}pgbouncer=true`}catch{return n}},"poolUsesTransactionMode",0,function(e){return e.includes("pgbouncer=true")||e.includes(":6543")}])},15132,e=>{"use strict";e.s(["logDbTiming",0,function(e,t,n){if("0"===process.env.DB_TIMING_LOG)return;let a=n?` ${JSON.stringify(n)}`:"";console.info(`[db-timing] ${e} ${t.toFixed(0)}ms${a}`)},"startDbTimer",0,function(){let e=performance.now();return()=>performance.now()-e}])},77773,e=>e.a(async(t,n)=>{try{var a=e.i(794),s=e.i(23862),i=e.i(53047),o=e.i(90185),l=e.i(15132),r=t([s]);function d(){let e=Number(process.env.DB_POOL_MAX??12);return!Number.isFinite(e)||e<1?12:Math.min(Math.floor(e),20)}async function u(e){try{let{host:t}=(0,i.parseDatabaseUrl)(e);return await a.default.lookup(t),!0}catch{return!1}}async function c(e){let t=new s.Pool({connectionString:e,ssl:{rejectUnauthorized:!1},max:1,connectionTimeoutMillis:2e3});try{let n=await t.connect();return await n.query("select 1"),n.release(),e}finally{await t.end()}}async function _(){let t=(0,l.startDbTimer)(),n=process.env.DATABASE_URL?.trim();if(!n)throw Error("DATABASE_URL is not set");if(e.g.__shidukhPgUrl)return(0,l.logDbTiming)("resolveConnectionString cache-hit",t()),e.g.__shidukhPgUrl;let a="";try{a=(0,i.parseDatabaseUrl)(n).host}catch{}let s=[...new Set((0,i.poolerConnectionCandidates)(n))];if(a.includes("pooler.supabase.com")&&1===s.length){let n=(0,o.appendPoolerQueryParams)(s[0]);return e.g.__shidukhPgUrl=n,(0,l.logDbTiming)("resolveConnectionString pooler-direct",t(),{host:a}),n}let r=s[0];if(r)try{if(await u(r)){let n=(0,o.appendPoolerQueryParams)(await c(r));return e.g.__shidukhPgUrl=n,(0,l.logDbTiming)("resolveConnectionString probe-ok",t(),{tried:1}),n}}catch{}let d=s.length<=6?s:s.slice(0,6),_="unknown";for(let n of d)try{if(!await u(n))continue;let a=(0,o.appendPoolerQueryParams)(await c(n));return e.g.__shidukhPgUrl=a,(0,l.logDbTiming)("resolveConnectionString probe-ok",t(),{tried:d.indexOf(n)+1}),a}catch(e){_=e instanceof Error?e.message:String(e)}throw Error(`Could not connect to Supabase via pooler (${d.length} tried): ${_}`)}async function p(){if(!e.g.__shidukhPg){let t=(0,l.startDbTimer)(),n=await _();e.g.__shidukhPgUrl=n;let a=(0,o.poolUsesTransactionMode)(n);e.g.__shidukhPg=new s.Pool({connectionString:n,ssl:{rejectUnauthorized:!1},max:d(),idleTimeoutMillis:1e4,connectionTimeoutMillis:8e3,allowExitOnIdle:!0,...a?{maxUses:7500}:{}}),(0,l.logDbTiming)("getPool init",t(),{txPool:a,max:d()})}return e.g.__shidukhPg}[s]=r.then?(await r)():r,e.s(["getPool",0,p,"getResolvedDatabaseHost",0,function(){let t=e.g.__shidukhPgUrl;if(!t)return null;try{return(0,i.parseDatabaseUrl)(t).host}catch{return null}}]),n()}catch(e){n(e)}},!1),37731,e=>{"use strict";let t=`
create table if not exists app_users (
  id text primary key,
  name text not null,
  role text not null check (role in ('employee', 'employer')),
  email text,
  image text,
  google_id text,
  is_test boolean not null default false,
  dataset_id text,
  employer_verified boolean not null default false,
  created_at timestamptz not null default now(),
  check ((is_test = false and dataset_id is null) or (is_test = true and dataset_id is not null))
);
create index if not exists app_users_email_idx on app_users (email);
create index if not exists app_users_test_idx on app_users (is_test, dataset_id);
create index if not exists app_users_google_id_idx on app_users (google_id);

create table if not exists employee_profiles (
  user_id text primary key references app_users (id) on delete cascade,
  card jsonb not null default '{}'::jsonb,
  pending_field_question_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists employee_profiles_card_gin on employee_profiles using gin (card);

create table if not exists employer_profiles (
  user_id text primary key references app_users (id) on delete cascade,
  card jsonb not null default '{}'::jsonb,
  jobs jsonb not null default '[]'::jsonb,
  active_job_id text,
  updated_at timestamptz not null default now()
);
create index if not exists employer_profiles_card_gin on employer_profiles using gin (card);

create table if not exists chat_messages (
  id text primary key,
  owner_user_id text not null references app_users (id) on delete cascade,
  conversation_context text not null default 'employee' check (conversation_context in ('employee', 'employer')),
  job_id text,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_owner_idx on chat_messages (owner_user_id, created_at);
-- Context index is created in schema.ts ALTERS (after conversation_context column exists)

create table if not exists field_questions (
  id text primary key,
  field text not null,
  question text not null,
  source_job_id text not null,
  source_employer_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists field_questions_field_idx on field_questions (field);

create table if not exists field_answers (
  question_id text not null references field_questions (id) on delete cascade,
  candidate_id text not null references app_users (id) on delete cascade,
  answer text not null,
  answered_at timestamptz not null default now(),
  primary key (question_id, candidate_id)
);

create table if not exists matches (
  id text primary key,
  job_owner_id text not null references app_users (id) on delete cascade,
  job_id text,
  candidate_id text not null references app_users (id) on delete cascade,
  score double precision not null,
  reason text not null,
  score_breakdown jsonb,
  is_test boolean not null default false,
  dataset_id text,
  status text not null check (status in ('queued', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_test = false and dataset_id is null) or (is_test = true and dataset_id is not null))
);
create index if not exists matches_test_idx on matches (is_test, dataset_id);
create index if not exists matches_job_owner_idx on matches (job_owner_id);
create index if not exists matches_candidate_idx on matches (candidate_id);

create table if not exists admin_settings (
  id text primary key default 'main',
  candidate_prompt text not null default '',
  employer_prompt text not null default '',
  updated_at timestamptz,
  updated_by text,
  prompt_bundle_version text
);

create table if not exists ai_usage (
  id text primary key,
  type text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cached_prompt_tokens integer not null default 0,
  thinking_tokens integer not null default 0,
  estimated_cost_usd double precision not null default 0,
  user_id text references app_users (id) on delete set null,
  model text,
  latency_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_created_at_idx on ai_usage (created_at desc);

create table if not exists card_field_definitions (
  id text primary key,
  card_type text not null check (card_type in ('candidate', 'job')),
  field_key text not null,
  label_he text not null,
  label_en text,
  field_group text,
  priority integer not null default 100,
  source text not null default 'system' check (source in ('system', 'employer', 'ai')),
  created_at timestamptz not null default now(),
  unique (card_type, field_key)
);

create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists app_store (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
`;e.s(["NORMALIZED_SCHEMA_SQL",0,t])},73566,e=>{"use strict";let t,n=null,a=0,s=Number(process.env.STORE_CACHE_TTL_MS??3e4),i=!1,o=null;e.s(["getCachedAdminSettings",0,function(){return t},"getCachedFieldQuestions",0,function(){return o},"getCachedStore",0,function(){return n},"invalidateStoreCache",0,function(){n=null,a=0,o=null,t=void 0},"isNormalizedDataCached",0,function(){return i},"isStoreCacheFresh",0,function(){return!!n&&(!Number.isFinite(s)||s<=0||Date.now()-a<s)},"markNormalizedDataPresent",0,function(){i=!0},"setCachedAdminSettings",0,function(e){t=e??null},"setCachedFieldQuestions",0,function(e){o=e},"setCachedStore",0,function(e){n=e,a=Date.now(),i=!0}])},85395,e=>e.a(async(t,n)=>{try{let c;var a=e.i(77773),s=e.i(37731),i=e.i(73566),o=e.i(15132),l=t([a]);[a]=l.then?(await l)():l;let _=`
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

create table if not exists user_rate_limit_windows (
  user_id text not null references app_users (id) on delete cascade,
  bucket text not null default 'ai',
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (user_id, bucket)
);
create index if not exists user_rate_limit_windows_window_idx
  on user_rate_limit_windows (window_start);

update matches
set id = 'pair__' || job_id || '__' || candidate_id
where coalesce(is_test, false) = false
  and job_id is not null
  and id not like 'pair__%';

create unique index if not exists matches_prod_job_candidate_uidx
  on matches (job_id, candidate_id)
  where coalesce(is_test, false) = false and job_id is not null;
`;async function r(e){try{let t=await e.query(`
      select (
        to_regclass('public.app_users') is not null
        and to_regclass('public.match_labels') is not null
        and exists (
          select 1 from schema_migrations
          where version in ('005_card_embeddings', '006_match_labels')
        )
      ) as ok
    `);return!!t.rows[0]?.ok}catch{return!1}}async function d(){let e=(0,o.startDbTimer)(),t=await (0,a.getPool)(),n=await r(t);for(let e of(n||(await t.query(s.NORMALIZED_SCHEMA_SQL),await t.query("insert into schema_migrations (version) values ($1) on conflict (version) do nothing",["005_card_embeddings"])),_.split(";").map(e=>e.trim()).filter(Boolean)))try{await t.query(e)}catch(t){console.warn("ensureSchema alter skipped",e.slice(0,80),t)}await t.query("insert into schema_migrations (version) values ($1) on conflict (version) do nothing",["017_matches_job_candidate_uidx"]),(0,o.logDbTiming)(n?"ensureSchema alters":"ensureSchema full DDL",e())}async function u(){if((0,i.isNormalizedDataCached)())return!0;let e=await (0,a.getPool)(),t=await e.query("select count(*)::text as count from app_users"),n=Number(t.rows[0]?.count??0)>0;return n&&(0,i.markNormalizedDataPresent)(),n}e.s(["ensureSchema",0,function(){return c||(c=d().catch(e=>{throw c=void 0,e})),c},"hasNormalizedData",0,u]),n()}catch(e){n(e)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__01n4y9t._.js.map