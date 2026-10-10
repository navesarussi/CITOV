# Matching evaluation (offline baseline)

This document describes how we measure job–candidate matching **before and after** algorithm changes. Production default is **hybrid** (semantic + rules) when embeddings exist; rule-only fallback otherwise.

## Dataset

| Item | Count |
|------|------:|
| Jobs | 25 |
| Candidates | 50 |
| Labeled (job, candidate) pairs | 90 |

**Location:** `eval/matching/` — `seed-jobs.ts`, `seed-candidates.ts`, `seed-labels.ts`. Cards validate against Zod patch schemas on every eval run.

**Labels:** `good` / `acceptable` / `bad` — see previous section in git history for grading table. Queue confusion uses threshold **0.28** unless noted.

## How to run

```bash
npm run eval:embed-fixtures   # Gemini if GOOGLE_GENERATIVE_AI_API_KEY set, else pseudo fixture
npm run eval:matching         # rule vs semantic vs hybrid table + results/latest.json
```

Embedding design: `docs/EMBEDDINGS.md`.

## Metrics snapshot @ threshold 0.28

Dataset version `2026-10-10-v1`. **Important:** numbers below used the committed **`pseudo-local-v1`** fixture (deterministic token hashing — **not** real Gemini semantics). Re-run both scripts with a Google API key and commit/use `fixtures/embeddings.json` before citing semantic lift in an interview.

| Matcher | P@5 | R@5 | MRR | nDCG@5 | Good missed | Bad queued |
|---------|----:|----:|----:|-------:|------------:|-----------:|
| **rule-based-v1** | 30.4% | 68.7% | 1.000 | 0.780 | 8 | 1 |
| **semantic-v1** (pseudo) | 33.6% | 76.1% | 1.000 | 0.825 | 0 | 32 |
| **hybrid-v1** 55/45 (pseudo) | 34.4% | 76.9% | 1.000 | 0.831 | 7 | 5 |

### Hybrid threshold sweep (pseudo fixture)

On the same fixture, a simple sweep favored **~0.30** over 0.28 for hybrid-v1: **good missed 7 → same order as tuned**, **bad queued 5 → 1**, with nDCG@5 ≈ 0.831 unchanged. Consider `MATCHING_QUEUE_THRESHOLD=0.30` when running hybrid after regenerating **Gemini** fixtures (verify again — do not trust pseudo for this decision).

### How to read the pseudo vs rule comparison

- **Rule baseline** misses cross-language “good” labels (zero token overlap).
- **Pseudo semantic** inflates recall but queues many **bad** labels (vectors are not truly semantic — noisy similarity).
- **Hybrid** trades off between them; with **real** Gemini embeddings you should see good-miss count drop **without** pseudo’s bad-queue explosion.

After you run:

```bash
export GOOGLE_GENERATIVE_AI_API_KEY=...
npm run eval:embed-fixtures   # writes fixtures/embeddings.json
npm run eval:matching
```

update this table with the three matcher rows from the CLI output.

## Pluggable matchers

Built-in: `rule-based-v1`, `semantic-v1`, `hybrid-v1` (fixture-backed). Register more in `eval/matching/eval-matchers.ts`.

## Code map

| Path | Role |
|------|------|
| `src/domain/matching-eval/*` | Metrics + eval aggregation |
| `src/domain/semantic-matching.ts` | Cosine blend + hybrid base |
| `src/domain/card-embedding-text.ts` | Segment text builder |
| `src/application/match-scoring.ts` | Production scoring + fallback flag |
| `scripts/eval-matching.ts` | CLI |

## Interview sound bite

“We measure first: labeled Hebrew set + offline harness. Rule overlap misses EN/HE pairs. Hybrid adds Gemini segment embeddings (role/skills/profile) with rules for location and must-haves. We only ship embedding changes when `eval:matching` improves nDCG and queue confusion on a **Gemini** fixture — not on the pseudo CI stub.”
