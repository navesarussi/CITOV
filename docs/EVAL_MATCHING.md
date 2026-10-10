# Matching evaluation (offline)

Labeled Hebrew-first set (25 jobs, 50 candidates, 90 pairs) under `eval/matching/`. **Fixture:** committed real Gemini vectors in `eval/matching/fixtures/embeddings.fixture.json` (`gemini-embedding-001`, 768d, 75 entities). Override locally with gitignored `embeddings.json`. Fallback: `embeddings.pseudo.fixture.json` (generate via `npm run eval:embed-fixtures` without API key — not semantic).

```bash
npm run eval:matching      # train + holdout tables + eval/matching/results/latest.json
npm run eval:generate-holdout-sheet  # holdout-v1.csv + label.html (~60 pairs)
npm run eval:import-labels -- path/to/labeled.csv  # → eval/matching/holdout-labels.json
npm run eval:embed-fixtures  # refresh vectors (needs GOOGLE_GENERATIVE_AI_API_KEY)
npm run seed:demo          # load eval cards into Postgres (needs DATABASE_URL; idempotent)
```

## Holdout labeling (human)

~60 pairs **not** in the 90 train labels: `eval/matching/labeling/holdout-v1.csv` (UTF-8 BOM). Open `eval/matching/labeling/label.html` locally (RTL, keyboard 1/2/3, export CSV/JSON). Import filled sheet with `eval:import-labels`; `eval:matching` then reports **Train** and **Holdout** separately.

## Overfitting note

Threshold (0.6), cosine floor (0.75), and hybrid weights (80/20) were grid-searched on **this same 90-pair label set** (see sweep in `scripts/eval-matching.ts`). Treat metrics as **optimistic** until we add a held-out job or label split.

## Real Gemini results (2026-10-10 fixture)

| Matcher | Thr | P@5 | R@5 | MRR | nDCG@5 | Good miss | Acc miss | Bad queued |
|---------|----:|----:|----:|----:|-------:|----------:|---------:|-----------:|
| **rule-based-v1** | 0.28 | 30.4% | 68.7% | 1.000 | 0.780 | 8 | 25 | 1 |
| **semantic-legacy-v1** (no calibration, \((c+1)/2\)) | 0.28 | 40.8% | 90.9% | 0.927 | 0.887 | 0 | 0 | **32** |
| **hybrid-legacy-v1** (55/45, no calibration) | 0.28 | 39.2% | 87.9% | 1.000 | 0.890 | 0 | 0 | **32** |
| **semantic-v1** (calibrated + empty-segment skip) | 0.28 | **41.6%** | **93.2%** | 1.000 | **0.943** | 0 | 6 | 9 |
| **hybrid-calibrated-v1** (production 80/20) | **0.60** | **41.6%** | 91.0% | 1.000 | 0.915 | **6** | 21 | **2** |

### What changed vs “before calibration”

Gemini cosines cluster between ~0.77 and 1.0, so mapping \((c+1)/2\) pushes almost everyone above the old **0.28** queue bar → **32 false queues**. **Calibration** `clamp((c − 0.75) / (1 − 0.75), 0, 1)` spreads scores. **Skipping empty profile segments** avoids treating blank `" "` embeddings as perfect matches. Production uses **threshold 0.60** with **80% semantic / 20% rule**.

### Remaining good misses (hybrid @ 0.60, typical)

Cross-language pairs where **rule role overlap is 0** and the **flexibility curve** still pulls sub-threshold scores despite strong role embeddings (e.g. `waiter` ↔ `מלצר`, `customer support` ↔ `נציג שירות`, `Chef` ↔ `טבח`). Mitigation in code: **role-calibrated floor** when token role score &lt; 0.2; must-have checks use bilingual token aliases + language-gap down-weight (blocks most `c47`-style leaks).

### Embedding cost (eval fixture run)

75 cards × 3 segments ≈ **75 `embedMany` batches** (3 texts each), ~**1.5–3k tokens** total — **~$0** on Gemini embedding pricing.

## Production defaults (env)

| Variable | Default |
|----------|---------|
| `MATCHING_COSINE_FLOOR` | `0.75` |
| `MATCHING_SEMANTIC_WEIGHT` | `0.8` |
| `MATCHING_RULE_WEIGHT` | `0.2` |
| `MATCHING_QUEUE_THRESHOLD` | `0.6` |
| `MATCHING_MODE` | `hybrid` |

See `docs/EMBEDDINGS.md` for segment design and storage.
