# Changelog

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
- Crowd labeling opt-in at `/help-match` (`source=crowd`).
- `matchCanonical` backfill on demo seed for Hebrew↔English rule matching.
- Labeling UI redesign and Gemini cache token logging (from 0.1.x work merged earlier today).

## 0.1.8

- Persistence, admin gate, full labeling card rows.
