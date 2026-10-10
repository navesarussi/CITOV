# Card embeddings for matching

## Segments (what we embed)

| Segment | Content | Not embedded |
|---------|---------|--------------|
| **role** | Title / desired role, field, seniority | Location, salary |
| **skills** | Skills, languages on skills lists, licenses, must/nice (jobs) | — |
| **profile** | Summary, narrative, culture/personality blurbs | — |

Empty segment text is **not embedded** and **not compared** (avoids the “blank profile = cosine 1.0” bug on legacy fixtures).

## Gemini + calibration

- Model: `GEMINI_EMBEDDING_MODEL` (default `gemini-embedding-001`), `EMBEDDING_DIMENSIONS=768`.
- Raw cosines for this model sit ~**0.77–1.0** on our eval set.
- **Calibration (production):** `fit = clamp((cosine − floor) / (1 − floor), 0, 1)` with `MATCHING_COSINE_FLOOR=0.75`.
- Legacy uncalibrated path: `(cosine + 1) / 2` — kept only for eval comparison (`semantic-legacy-v1`).

## Hybrid score

1. Calibrated semantic fit (segment-weighted cosines, must-have **penalty** in semantic leg only).
2. Blend: `0.8 × semantic + 0.2 × rule` (`computeBaseFit`).
3. **Cross-language role floor:** if calibrated role ≥ 0.35 and token role overlap &lt; 0.2 → `base ≥ 0.42 + 0.55 × roleCalibrated`.
4. **Must-have gate:** bilingual token matching on must-haves; **language gap** (e.g. job requires Hebrew, card does not show it) ×0.55; otherwise flex-aware `applyMustHaveGate` when overlap &lt; 1.
5. **Flexibility curve** (`applyFlexibility`) on the combined base.
6. Queue if score ≥ `MATCHING_QUEUE_THRESHOLD` (default **0.60**).

Graceful degradation: no vectors → rule-only fallback (reason suffix in UI).

## Storage

Postgres `card_embedding_segments` (pgvector 768). Re-embed on **card patch** only. Dev without `DATABASE_URL`: in-memory map.

## Eval fixture

Committed **`eval/matching/fixtures/embeddings.fixture.json`** (real Gemini, vectors only). Regenerate:

```bash
export GOOGLE_GENERATIVE_AI_API_KEY=...
npm run eval:embed-fixtures   # writes embeddings.json (optional local override)
```

**Cost:** ~75 embed calls, ~1.5–3k tokens, ~$0.

## Demo seed

`npm run seed:demo` loads eval job/candidate cards into Postgres via `writeNormalizedStore` (marker `eval-cards-v1`). **Point `DATABASE_URL` at your local DB only.**
