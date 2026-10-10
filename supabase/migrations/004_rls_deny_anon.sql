-- Deny PostgREST anon/authenticated roles by default (M6). App server uses service/migrator role.

create table if not exists admin_audit_log (
  id text primary key,
  actor_email text not null,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

alter table if exists app_users enable row level security;
alter table if exists employee_profiles enable row level security;
alter table if exists employer_profiles enable row level security;
alter table if exists chat_messages enable row level security;
alter table if exists field_questions enable row level security;
alter table if exists field_answers enable row level security;
alter table if exists matches enable row level security;
alter table if exists admin_settings enable row level security;
alter table if exists ai_usage enable row level security;
alter table if exists candidate_document_blobs enable row level security;
alter table if exists card_embedding_segments enable row level security;
alter table if exists match_labels enable row level security;
alter table if exists app_events enable row level security;
alter table if exists user_rate_limit_windows enable row level security;
alter table if exists admin_audit_log enable row level security;

-- No policies for anon/authenticated → deny all via RLS.
