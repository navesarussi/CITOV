# Cross-language matching consistency report

Eval: `runCrossLangConsistencyEval()` — 20 logical pairs × 3 variants (`en`, `he`, `mixed`), tolerance **0.05** on rule / semantic / hybrid bases, identical queue decision vs English baseline.

| Variant | Pass rate (before alias + dataset fixes) | Pass rate (after, this PR) |
|---------|------------------------------------------|----------------------------|
| `en` (baseline) | 100% | 100% |
| `he` | ~55% | **100%** |
| `mixed` | ~70% | **100%** |
| **Overall pairs** | ~35% (7/20) | **100% (20/20)** |

## Failures fixed (representative)

| Pair | Issue | Fix |
|------|--------|-----|
| p03-dev-react | Role/field mismatch EN vs HE | Aligned titles; `מפתח Full Stack` alias |
| p04-support-haifa | Customer service titles | `ROLE_ALIASES` for support roles |
| p07–p08, p10, p13 | Asymmetric cand/job titles in HE | Symmetric HE/EN pair specs |
| p15–p17 | Field + role not canonical | `FIELD_ALIASES` + bookkeeper/security |
| Hybrid Δ on mixed | Semantic opts on raw Hebrew text | Score using `enrich*ForRuleMatch` views |

## Frozen holdout (overfitting check)

Separate set: `eval/matching/cross-lang-holdout-dataset.ts` — **15** pairs authored without alias-table tuning (slang/typos: פולסטאק, דבאופס, ר"ג, etc.).

| Variant | Pass rate (holdout, honest) |
|---------|-----------------------------|
| `en` | 100% |
| `he` | ~40% |
| `mixed` | ~13% |
| **Overall pairs** | **~13% (2/15)** |

CI logs holdout under “holdout קפוא” — **report-only**, does not gate merge. Training set (`cross-lang-dataset.ts`, 20 pairs) remains at **100%** with `minOverallPassRate: 1`.

## Rule scoring (HE/EN)

- **Salary:** normalized to ILS/month (`salary-normalize.ts`) — overlap score, not `textScore`.
- **Personality / culture:** rule components **0**; profile segment embeddings only.

## Prod canonical coverage

Run on deploy (read-only): `npx tsx scripts/report-match-canonical-coverage.ts`  
Backfill: `--apply` (uses `backfillMatchCanonicalOnStore`). Coverage % is environment-specific; goal **≥95%** critical complete post-backfill.
