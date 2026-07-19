# CODE QUALITY — shidukh-poc

Architecture: Domain ← Application ← Infrastructure / App.

- Max ~200 lines per file where practical
- Domain has zero framework imports
- AI provider swappable (Gemini / heuristic)

[PENDING REFACTOR]: replace JSON file store with SQLite/Postgres when multi-user concurrency matters.
