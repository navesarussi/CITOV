# Changelog

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
