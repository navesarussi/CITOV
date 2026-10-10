# Match-quality test sandbox

Isolated dataset for labeling and eval — **never** shown to real candidates or production metrics.

## IDs and flags

- Users/jobs/candidates: `sandbox-*` prefix
- DB: `is_test = true`, `dataset_id = quality-sandbox-v1`
- Production reads use `filterProductionStore()` (matching, opportunities, employer queue)

## Regenerate

```bash
DATABASE_URL=... npm run seed:test-sandbox
```

Deletes prior sandbox rows, generates ~150 jobs + ~150 synthetic candidates, runs production hybrid matcher (with `score_breakdown`), persists queued matches.

Optional future: set `SANDBOX_JOB_URLS` to comma-separated public career page URLs (plain fetch; no LinkedIn).

## Admin labeling

Toggle **נתוני בדיקה** on `/admin/labeling`. Queue prioritizes uncertain pairs (near threshold + rule/hybrid disagreement). Labels save as `source=test-run` and feed live eval export (holdout pairs `sandbox-job-1..20` are excluded from the active queue).
