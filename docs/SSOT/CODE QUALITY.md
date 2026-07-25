# CODE QUALITY — shidukh-poc

Architecture: Domain ← Application ← Infrastructure / App.

- Max ~200 lines per file where practical
- Domain has zero framework imports
- AI provider swappable (Gemini / heuristic)
- Product chat behavior is defined in `docs/SSOT/CHAT_AGENTS.md` and SRS FR-CHAT-*
- Chat intake uses `generateObject({ system, messages })` with full recent history; match rebuild is deferred via `after()`
- Hot paths: `assertActor` loads an **actor slice** (self profile/chat/prompts only); list endpoints use opportunity/queue slices
- Interactive writes use `scoped-store` (per-user upsert / chat insert / chat clear / match status) — not whole-DB `persistStore`
- Chat replies **stream** (NDJSON deltas); card extraction runs in parallel off the reply path
- Match rebuild debounced via `scheduleMatchRebuild` (~1.5s coalesce) + `readMatchingStore()` (cards+matches, no chats)
- Shared in-process cache for `field_questions` + `admin_settings` (invalidated on writes)
- DB pool default max 12 (`DB_POOL_MAX`), prefer cached pooler host on connect
- Admin prompts: live DB override + reset-to-file defaults (`DELETE /api/admin/prompts`)
- [PENDING REFACTOR]: split `scoped-store.ts` / `slice-store.ts` / chat route under 200-line cap
- [PENDING REFACTOR]: SQL-scope field-question broadcast (still rare full-store path)

## Data layer (Supabase)

- Normalized tables + JSONB card columns (`employee_profiles.card`, `employer_profiles.card`)
- Runtime expansion via `extras` on cards; employer field questions merge into `extras`
- `card_field_definitions` for optional metadata on dynamic keys (no DDL per new question)
- Legacy `app_store` blob auto-migrated on first read after deploy
- DB pool: DNS-filter pooler candidates then probe in small batches; cache last-good URL per instance
- Session start uses `upsertSessionRole` (no full-store rewrite)
- Default pooler preference: `aws-1` / `ap-south-1` (prod `resolvedHost`); override via `SUPABASE_POOLER_*`
- Google OAuth soft-disabled via `GOOGLE_AUTH_ENABLED` (open local sessions while false)
- Test login (`ALLOW_TEST_LOGIN=true`) entry is **`/demo` only** — public landings never show the dialog
- Employer multi-job: `jobs` jsonb + `matches.job_id`; active job drives chat/candidates
- Chat persistence: `chat_messages.conversation_context` (`employee`|`employer`) + optional `job_id` — never key chats by `owner_user_id` alone
- Schema bootstrap: additive `ALTER`s (incl. `conversation_context`) run after `CREATE TABLE IF NOT EXISTS`; context index lives in ALTERS so existing DBs migrate without failing on missing columns
- Candidate card audiences: `domain/candidate-card-views.ts` (`full` | `candidate` | `employer`); employer API projects via `projectCandidateCard`
- Approved opportunities use `jobCardForMatch` (matched job, not active-job mirror) and surface contact fields
- [PENDING REFACTOR]: split `SettingsMenu.tsx` under 200-line cap
- [PENDING REFACTOR]: split `domain/cv-merge.ts` under 200-line cap
- [PENDING REFACTOR]: split `application/chat.ts` under 200-line cap after CV reliability work
- [PENDING REFACTOR]: during CV subtext work, prefer new files (`cv-sanitize.ts`, `reliability.ts`, `cv-extraction.ts`) over growing `intake.ts` / `cv-merge.ts` further
- Settings sign-out clears `shidukh_user` + NextAuth session (when present) and returns to `/`
- [PENDING REFACTOR]: split `FileImport.tsx` under 200-line cap
- [PENDING REFACTOR]: restore default-role switch in Settings (FR-UI-01 / FR-UI-04) — landings are split; memory key still written on session start
- [PENDING REFACTOR]: project `/api/me` candidate payload to candidate presentation (UI already hides sensitive fields)