# CODE QUALITY — shidukh-poc

Architecture: Domain ← Application ← Infrastructure / App.

- Max ~200 lines per file where practical
- Domain has zero framework imports
- AI provider swappable (Gemini / heuristic)
- Product chat behavior is defined in `docs/SSOT/CHAT_AGENTS.md` and SRS FR-CHAT-*
- Chat intake uses `generateObject({ system, messages })` with full recent history; match rebuild is deferred via `after()`

[PENDING REFACTOR]: split `app_store` jsonb blob into normalized tables when concurrency / querying needs grow.
