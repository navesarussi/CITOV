# Card embeddings for matching

## What we embed (and what we do not)

Each card is split into **three short texts** (see `src/domain/card-embedding-text.ts`):

| Segment | Candidate | Job |
|---------|-----------|-----|
| **role** | `desiredRole`, `field`, `subField`, `experienceLevel` | `title`, `field`, `subField`, `seniorityLevel` |
| **skills** | `skills`, `softSkills`, `licenses`, `certifications`, `computerSkills` | `mustHaves`, `niceToHaves`, `toolsRequired`, `requiredLicenses` |
| **profile** | `summary`, `narrative`, personality / work style / goals | `summary`, `narrative`, culture / company blurb |

**Intentionally excluded from vectors:** `location`, salary fields, languages list, and raw must-haves as hard gates — those stay in the **rule-based** scorer (overlap, must-have penalty, flexibility curve).

### Tradeoffs

- **Pros:** Cross-language titles (`waiter` ↔ `מלצר`) live in the role segment; skills stay comparable without diluting the role vector with salary noise.
- **Cons:** Location/salary mismatches are only as strong as rules make them; a bad location match can still rank high if semantics align. Hybrid weighting balances this.
- **Re-embed cost:** Three API calls per card change (batched via `embedMany` per segment group in one `embedSegmentTexts` call = one batch of 3 texts per card).

## Model and env

| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Google embedding model id |
| `EMBEDDING_DIMENSIONS` | `768` | `outputDimensionality` (smaller DB rows; full model default is larger) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | — | Required for live Gemini embeddings |
| `MATCHING_MODE` | `hybrid` | `rule` \| `semantic` \| `hybrid` |
| `MATCHING_SEMANTIC_WEIGHT` | `0.55` | Hybrid blend |
| `MATCHING_RULE_WEIGHT` | `0.45` | Hybrid blend |
| `MATCHING_QUEUE_THRESHOLD` | `0.28` | Employer queue cutoff |

Implementation: `src/infrastructure/ai/embeddings.ts` (`embed` / `embedMany` via Vercel AI SDK).

## Storage (Postgres + pgvector)

Table `card_embedding_segments` (see `supabase/migrations/003_card_embeddings.sql` and `ensureSchema` ALTERS):

- One row per `(owner_kind, owner_id, job_slot_id, segment, model)`
- `content_hash` — SHA-256 of segment text; skip Gemini when unchanged
- `embedding vector(768)`

**When we embed:** After a **card patch** (chat intake or CV extraction), via `scheduleCandidateEmbeddingRefresh` / `scheduleJobEmbeddingRefresh` — not on every chat token.

**Dev without DB:** In-memory map in `card-embeddings-memory.ts` when `DATABASE_URL` is unset.

## Matching modes

- **rule:** Legacy word overlap (`computeBaseFit` + flexibility).
- **semantic:** Segment cosine similarity → unit fit, light must-have penalty, then flexibility.
- **hybrid:** `0.55 * semantic + 0.45 * rule` (configurable), then flexibility.

If vectors are missing, production **falls back to rule** and appends `embeddings unavailable (rule fallback)` to the match reason.

## Offline eval fixtures

```bash
npm run eval:embed-fixtures   # needs API key for real Gemini vectors → embeddings.json
npm run eval:matching         # compares rule / semantic / hybrid
```

Committed `eval/matching/fixtures/embeddings.fixture.json` is **pseudo-local-v1** (deterministic bag-of-tokens) for CI wiring only. Replace with Gemini-generated `embeddings.json` locally before claiming semantic lift in an interview demo.
