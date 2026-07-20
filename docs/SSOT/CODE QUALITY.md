# CODE QUALITY — shidukh-poc

Architecture: Domain ← Application ← Infrastructure / App.

- Max ~200 lines per file where practical
- Domain has zero framework imports
- AI provider swappable (Gemini / heuristic)
- Product chat behavior is defined in `docs/SSOT/CHAT_AGENTS.md` and SRS FR-CHAT-*
- Chat intake uses `generateObject({ system, messages })` with full recent history; match rebuild is deferred via `after()`
- Hot paths: single `readStore` via `assertActor`, chat returns card without full page refetch
- Admin prompts: live DB override + reset-to-file defaults (`DELETE /api/admin/prompts`)

## Data layer (Supabase)

- Normalized tables + JSONB card columns (`employee_profiles.card`, `employer_profiles.card`)
- Runtime expansion via `extras` on cards; employer field questions merge into `extras`
- `card_field_definitions` for optional metadata on dynamic keys (no DDL per new question)
- Legacy `app_store` blob auto-migrated on first read after deploy
