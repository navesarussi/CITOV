# Changelog

## 0.4.24 — 2025-10-10

- **Fix:** Match rebuild no longer drops eval demo queued matches — `seed-*` users participate in rebuild; only sandbox/e2e/singleton demo personas are skipped (fixes admin «התאמות 0» after backfill/H6).
- Design system: `src/theme/` tokens + `src/ui/` primitives; denser admin mobile stat grid.
- Domain-aware profiles: skills taxonomy (HE/EN aliases, skill→family) on `matchCanonical` and rule overlap; hi-tech optional fields (seniority, tech stack, industry domain, GitHub, clearance); domain-specific chat questions and field priorities; per-domain hybrid/rule/segment weight presets; optional salary-band hard filter; eval hi-tech pairs (`j26`, `c51`, `c52`).

## 0.4.23 — 2025-10-10

- Admin mobile: fix התאמות list (stop filtering demo pairs after scope); job/candidate pickers; version badge in עוד only; compact dashboard פעולות menu; demo seed blocked when real users exist; Hebrew cost labels; `gemini-flash-latest` pricing; LLM judge B blind verdict then critique.

## 0.4.22 — 2025-10-10

- Degraded match queue floor (`MATCH_DEGRADED_RULE_QUEUE_FLOOR`, default 0.38).
- `after()` handlers await degraded-turn persist + `flushScheduledMatchRebuild()` (chat, CV, flexibility).
- M1 security headers; M2 client events rate limit + message cap; M3 CV/job fieldKey allow-lists; M4 user-turn delimiters in chat prompts.

## 0.4.21 — 2025-10-10

- Matching (H6): stable match IDs `pair__{jobId}__{candidateId}` on rebuild; unique index on production `(job_id, candidate_id)`; employer status updates only from `queued`.

## 0.4.20 — 2025-10-10

- Matching (H5/H4): semantic leg scaled by `semanticMustHaveFactor(overlap)`; role boost capped at 0.88 and skipped when must-have overlap &lt; 0.34.

## 0.4.19 — 2025-10-10

- Security (H3): complete delete-my-data — embeddings, degraded turns, employer field questions, match labels, event PII scrub, CV blobs; blocks demo/test users; UI surfaces API errors.

## 0.4.18 — 2025-10-10

- Security (H2): chat message length cap + JSON `Content-Length` guard; per-user AI rate limit persisted in Postgres (`user_rate_limit_windows`) with dev memory-store fallback.

## 0.4.17 — 2025-10-10

- Admin **התאמות** page: filters (בתור / אושרו / נדחו / מתחת לסף), scope toggle, search, pagination, explain drawer; links from candidate/job detail.
- Mobile nav: single bottom bar (דשבורד, התאמות, תיוג, ניטור, עוד) — full-screen “עוד” list; no overlapping header menu on mobile.

## 0.4.16 — 2025-10-10

- Security (H1): public `/api/health/db|ai|auth` return `{ ok }` only; admin `?detail=1` for diagnostics.

## 0.4.15 — 2025-10-10

- Security (C2): block full `writeNormalizedStore` unless `ALLOW_FULL_STORE_WRITE=1`; targeted field-question persist for employer ask; remove redundant full-store write on admin threshold apply; store cache TTL ~30s.

## 0.4.14 — 2025-10-10

- Security (C1): CV access only on approved matches + verified employer + identity-reveal flag; queued candidates anonymized; role immutable after signup; admin employer verification toggle.

## 0.4.13 — 2025-10-10

- Admin mobile: fixed bottom tab bar (דשבורד, תיוג, ניטור, ארכיטקטורה, עוד); removed תפריט מנהל sheet and header hamburger on small screens.
- Compact mobile density (headers, architecture stepper, panels).
- Mobile-first labeling: one pair, collapsible cards, thumb actions + skip; holdout queue with frozen LLM-judge suggestions (`holdout-v1.judgments.json`).
- Playwright: tab navigation tests at 375/390/414.

## 0.4.9.1 — 2025-10-10

- Fix CHANGELOG merge conflict markers on main; CI fails if conflict markers are committed.

## 0.4.9 — 2025-10-10

- CV extraction: no chat-heuristic fallback on failure/budget miss — mark `failed` for retry instead of polluting card fields.

## 0.4.8 — 2025-10-10

- Gemini list pricing table (2.5 Flash/Pro, embeddings) aligned to Google docs; cached input ~10%.
- CV extraction merges thinking/cached tokens across passes; judge B usage logged with its model id.

## 0.4.7 — 2025-10-10

- Apply AI monthly budget guard on main chat stream path and patch/reply extractors.

## 0.4.6 — 2025-10-10

- Match rebuild: replace production `queued` rows only (preserve sandbox + employer decisions); advisory lock around rebuild write.

## 0.4.5 — 2025-10-10

- Extraction evidence: merge overlapping work-history intervals before summing experience years.
- Numeric fields validated against field evidence only (not whole CV text); deterministic experience-years still allowed.
- `validateFieldSanity` / work-history checks (date order, plausible years, salary) → pending confirmation when failed.

## 0.4.4 — 2025-10-10

- **Removed crowd labeling** (`/help-match`, `/api/crowd-labeling`) for privacy; legacy `source=crowd` rows remain in DB but are excluded from admin metrics and eval.
- Candidate **לא רלוונטי** now stored as `candidate_action`; employer approve/reject unchanged; admin + LLM-judge labeling unchanged.

## 0.3.6 — 2025-10-10

- Test-data sandbox: `is_test` + `dataset_id` on users/matches, production store filters, `sandbox-*` IDs.
- Generator (~150 jobs / ~150 synthetic candidates), `npm run seed:test-sandbox`, sandbox-only matching with score breakdown.
- Admin labeling: **נתוני בדיקה** toggle, `test-run` labels with uncertainty-prioritized queue; frozen holdout pairs for eval.

## 0.3.5 — 2025-10-10

- Persist structured `score_breakdown` on queued matches (rule components, semantic segments, hybrid gates, flexibility, engine config).
- Admin **למה ההתאמה הזו?** drawer with Hebrew waterfall + side-by-side cards; candidates see top reasons and **לא רלוונטי** feedback.
- Match rebuilds log to monitoring; flexibility rebuild uses embedding-aware path; role-boost documented + holdout A/B test.

## 0.3.4 — 2025-10-10

- CV/job extraction: evidence quote per fact field, deterministic source/number checks, failed/low/medium → pending user confirmation in chat.
- Cards show fields awaiting approval; employer job import uses the same gating.
- Golden extraction eval (~15 CVs + ~10 jobs) with before/after metrics on admin monitoring.

## 0.3.3 — 2025-10-10

- Admin **פרומפטים** tab: full prompt studio (cards, RTL editor, variable chips, preview, versioning, diff, rollback, eval).
- Runtime prompts for CV extraction, job extraction, match enrich, and card translation read from version store.
- Removed developer placeholder copy from admin dashboard and guidelines page.

## 0.3.2 — 2025-10-10

- Fix AI usage logging: persist CV analyze usage, chat reply stream + patch (2 rows/turn), embeddings.
- Admin AI cost panel: today/7d/month, by feature/model/user, trend chart, budget bar, last 50 calls, auto-refresh.
- Dashboard reads `ai_usage` from Postgres (not stale in-memory snapshot).

## 0.3.1 — 2025-10-10

- Candidate / admin preview: prominent CV dropzone + button when chat is locked; side-by-side profile + chat on desktop.
- Chat panel fills available viewport height (embedded admin preview, mobile sticky composer, responsive grid).
- Playwright responsive screenshots at 375 / 768 / 1280 / 1920 widths.

## 0.3.0 — 2025-10-10

- Admin **ניטור**: `app_events` table, grouped issues, slow-route stats, AI budget banner/guard, E2E last run.
- AI budget env caps (`AI_BUDGET_USD_DAILY` / `MONTHLY`) with heuristic fallback when exceeded.
- Playwright E2E workflow + `/api/e2e/session` / `/api/e2e/bootstrap` / `/api/e2e/report` (flagged `e2e-*` users excluded from metrics).
- Optional owner alert on new critical issues (`OWNER_ALERT_EMAIL` + `RESEND_*` or `OWNER_ALERT_WEBHOOK`).

## 0.2.3 — 2025-10-10

- Labeling POST: drop unused `labeler_role` insert; schema alters run statement-by-statement.
- Hebrew display for admin labeling cards/field compare; backfill persists Hebrew + canonical.
- Matcher rename + threshold preview (before/after queue/agreement) with confirmation.
- Admin layout cache provider, nav prefetch, labeling note persisted in sessionStorage.

## 0.2.2 — 2025-10-10

- Fix prod labeling 500: `ensureSchema` always runs idempotent ALTERs (`labeler_role`, `match_queue_threshold`, etc.).
- Labeling field compare uses `matchCanonical`; demo seed shows Hebrew cards; admin **עדכון matchCanonical** action.
- Clearer matcher labels and inline threshold help on `/admin/labeling`.

## 0.2.1 — 2025-10-10

- Admin candidate/employer views use the signed-in admin’s real workspace profiles (same UX as `/employee` and `/employer`), not separate sandbox users.

## 0.2.0 — 2025-10-10

- Admin preview links for candidate/employer workspace (later replaced by real profiles in 0.2.1).
- Admin navigation: dashboard link on all admin pages; guidelines page.
- Employer job list: human titles, location, match counts; technical IDs behind toggle.
- AI cost dashboard: token-level cost from API usage + documented Gemini list pricing; daily breakdown.
- ~~Crowd labeling~~ (removed in 0.4.4).
- `matchCanonical` backfill on demo seed for Hebrew↔English rule matching.
- Labeling UI redesign and Gemini cache token logging (from 0.1.x work merged earlier today).

## 0.1.8

- Persistence, admin gate, full labeling card rows.
