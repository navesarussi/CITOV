<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CITOV (shidukh-poc) — agent map

PoC: Hebrew-first AI job matching (Next.js 16, Supabase Postgres, Gemini via Vercel AI SDK). Product truth: `docs/SSOT/SRS.md`. Code patterns: `docs/SSOT/CODE QUALITY.md`.

## Architecture (clean-ish layers)

```
src/domain/          Pure logic: matching, cards, CV merge, eval metrics
src/application/     Use cases: chat turns, rebuild matches, CV import, admin
src/infrastructure/  DB, AI, auth, files, Supabase client
src/app/             Next routes & API handlers
eval/matching/       Offline labeled eval set + embedding fixtures
```

**Dependency rule:** domain imports nothing from application/infrastructure. Application orchestrates; infrastructure implements ports (DB, Gemini).

## Key flows

1. **Chat turn** — `POST /api/chat` → `application/chat-turn.ts` (patch merge) → `scoped-store` persist → `after()`: `card-embedding-sync` + debounced `match-scheduler` → `rebuildAndWriteMatches` (hybrid if vectors exist).
2. **CV pipeline** — upload → `cv-import.ts` / `analyze` route → `infrastructure/ai/cv-extraction.ts` → `applyCvExtraction` → embedding refresh + match rebuild.
3. **Card merge** — `applyCandidatePatchSafely` / `applyJobPatch`; conflicts → `domain/cv-merge.ts`. Only changed fields; arrays merge for skills.
4. **Matching** — `application/rebuild-matches.ts` + `match-scoring.ts`; scores from rule and/or `card_embedding_segments`. Queue threshold `MATCHING_QUEUE_THRESHOLD` (default 0.28).
5. **Eval** — `npm run eval:matching` (no DB); optional `npm run eval:embed-fixtures` with `GOOGLE_GENERATIVE_AI_API_KEY`. See `docs/EVAL_MATCHING.md`.

## Commands

```bash
npm run dev          # local app (memory store if no DATABASE_URL)
npm test             # unit tests (tsx --test)
npm run eval:matching
npm run eval:embed-fixtures
```

## Conventions

- Card patches validate with `jobPatchSchema` / `candidatePatchSchema` (`infrastructure/ai/schemas.ts`).
- Prompt bundle version: `PROMPT_BUNDLE_VERSION` in `domain/types.ts`; admin overrides in `infrastructure/ai/prompts.ts`.
- Do **not** call Gemini on every chat message for matching — only on card changes for embeddings.
- Do **not** wire `enrichReasonWithAi` in hot paths without a product decision (extra cost/latency per match); rule-based `explainMatch` is used today.
- Migrations: append to `infrastructure/db/schema.ts` `ALTERS` + bump `MIGRATION_VERSION`; mirror in `supabase/migrations/`.

## Matching measurement rule

Before changing matching logic, extend or run `eval:matching` and record baseline vs new matchers in `docs/EVAL_MATCHING.md`.
