# Matching evaluation (offline baseline)

This document describes how we measure job–candidate matching **before** changing the algorithm. The current production matcher is rule-based word overlap in `src/domain/matching.ts`. A future semantic matcher (embeddings + pgvector) must beat these numbers on the same set.

## Dataset

| Item | Count |
|------|------:|
| Jobs | 25 |
| Candidates | 50 |
| Labeled (job, candidate) pairs | 90 |

**Location:** `eval/matching/` — `seed-jobs.ts`, `seed-candidates.ts`, and `seed-labels.ts` compose the set (`dataset.ts`). Cards validate against `jobPatchSchema` / `candidatePatchSchema` on every eval run.

**Language:** Mostly Hebrew job titles and profiles, with deliberate English and mixed pairs (e.g. job title `Waiter`, candidate `מלצר`).

**Labels (human-style):**

| Label | Meaning | Used as “relevant” for P@5 / R@5? | nDCG gain |
|-------|---------|-----------------------------------|-----------|
| `good` | Strong hire fit | Yes | 3 |
| `acceptable` | Plausible but imperfect (location, seniority, related role) | Yes | 2 |
| `bad` | Should not surface | No | 0 |

Unlabeled pairs are treated as irrelevant (gain 0). Recall@5 is computed against all labeled `good` + `acceptable` candidates for that job.

**Hard cases baked in:**

- Synonyms and Hebrew ↔ English roles (`מלצר` / `waiter`, `software engineer` / `מפתח תוכנה`)
- Related roles (`waiter` vs `bartender`)
- Must-have skill missing (e.g. Hebrew fluency not listed)
- Salary / location mismatch
- Same field, different seniority (`Junior Frontend` vs senior frontend candidate)
- Near-duplicate titles with different requirements

## How to run

```bash
npm run eval:matching
```

- No database, no Gemini, no network.
- Prints a summary table and failure breakdown to the terminal.
- Writes `eval/matching/results/latest.json` (gitignored; regenerate anytime).

## Metrics

| Metric | What it tells us |
|--------|------------------|
| **Precision@5** | Of the top 5 ranked candidates per job, what fraction are labeled good or acceptable? |
| **Recall@5** | What fraction of all good+acceptable labels for that job appear in the top 5? |
| **MRR** | Mean reciprocal rank of the first relevant candidate (macro over jobs). |
| **nDCG@5** | Ranking quality with graded relevance (good > acceptable > bad). |
| **Queue threshold (0.28)** | Same cutoff as `shouldQueueForEmployer`: good/acceptable **missed** (score &lt; 0.28), bad **queued** (score ≥ 0.28). |

Reported macro numbers are the **unweighted mean over jobs** (each job counts equally).

## Baseline — rule-based matcher (`rule-based-v1`)

Captured with `npm run eval:matching` on dataset version `2026-10-10-v1`:

| Metric | Value |
|--------|------:|
| Precision@5 | **30.4%** |
| Recall@5 | **68.7%** |
| MRR | **1.000** |
| nDCG@5 | **0.780** |
| Good fits missed (below 0.28) | **8** |
| Acceptable fits missed | **18** |
| Bad fits queued | **1** |

### Why MRR is 1.0 but precision is low

For almost every job there is at least one **Hebrew–Hebrew** labeled match that ranks first (e.g. `מלצר/ית` ↔ `מלצר`). MRR only cares about the first relevant hit. Precision@5 and nDCG still punish missing cross-language “good” labels lower in the list and irrelevant noise in the top 5.

### Top failure categories (with examples)

1. **Synonym / cross-language role (8 good misses)** — token overlap is zero across scripts/languages, so score ≈ 0% and nothing is queued:
   - `מלצר/ית` ↔ candidate `waiter`
   - `Waiter` ↔ candidate `מלצר`
   - `Customer Support Agent` ↔ `customer support` / `נציג שירות`
   - `טבח/ית` ↔ `Chef`, hotel reception ↔ `hotel receptionist`

2. **Hebrew morphology / title wording (1 good miss)** — e.g. job `אח/ות מוסמך/ת` vs candidate `אחות מוסמכת` scores ~25% (below threshold).

3. **False queue (1 bad queued)** — `c47` matched `מלצר/ית` at ~52% despite missing explicit Hebrew service skill in the label note (overlap on role/location/servicе-like tokens).

### Weakest jobs (by nDCG@5)

| Job | nDCG@5 | R@5 |
|-----|-------:|----:|
| Waiter (English) | 0.44 | 25% |
| Software Engineer | 0.57 | 33% |
| Customer Support Agent | 0.61 | 50% |

These are exactly the jobs where the best human-labeled candidates include English or cross-language titles.

## Pluggable matchers

Register comparators in `scripts/eval-matching.ts`:

```typescript
const MATCHERS: MatcherDefinition[] = [
  defaultRuleBasedMatcher,
  // { id: "embeddings-v1", label: "...", score: (c, j) => ... },
];
```

Each matcher must return a score on the same 0–1 scale as production (`scoreMatch` = base fit + flexibility). Re-run `npm run eval:matching` to append results side by side in the table and JSON.

## Code map

| Path | Role |
|------|------|
| `src/domain/matching-eval/metrics.ts` | Pure metric functions (unit tested) |
| `src/domain/matching-eval/evaluate.ts` | Rank per job, aggregate, threshold confusion |
| `src/domain/matching.ts` | `scoreMatch()` — production-equivalent scorer |
| `scripts/eval-matching.ts` | CLI entrypoint |

## Interview sound bite

“We built a labeled Hebrew-first eval set and a offline harness. The current overlap matcher gets **68.7% recall@5** but only **30.4% precision@5**, and **eight** clear ‘good’ fits never reach the employer queue because English/Hebrew titles don’t share tokens — that’s the gap we expect embeddings to close, and we’ll only merge when this same script proves the lift.”
