-- pgvector storage for card embedding segments (see docs/EMBEDDINGS.md)
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
