# Design: Deep CV Analysis → Candidate Card + Document Storage

**Date:** 2026-07-23  
**Status:** Approved for implementation planning  
**Approach:** Enrich-in-place (extend existing `/api/cv` + `runCvExtraction` flow)  
**SRS:** FR-CV-01 … FR-CV-05, FR-CARDS, FR-DATA, FR-UI-07, FR-CHAT-*

## Problem

CV upload already extracts text and patches some candidate fields, but:

1. AI extraction is shallow (short preferred-field list, weak coverage).
2. Only ~3,000 characters of CV text are stuffed into `narrative`; the original file is not stored.
3. Conflicts with chat-filled data are silently overwritten or lost.
4. Candidates must not see the full rich card (FR-UI-07); they need a minimal “we captured it” summary.

## Goals

- Deep, professional AI extraction of **all** explicit CV information into the candidate profile.
- Persist the original CV file for future viewing (admin always; employer in match context).
- Preserve dual evidence on conflicts; chat clarifies which value is current without deleting sources.
- Structured `workHistory` + `educationHistory` plus unmapped facts so nothing is dropped.
- Candidate UX: minimal summary only after upload.

## Non-goals

- Showing the full card field list to regular candidates.
- Making the CV a separate “source of truth” document that replaces the card (no dual-model sync).
- Two-pass LLM pipeline (cost/latency); single rigorous `generateObject` call is enough for v1.
- Candidate download of the full extracted internal profile.

## Architecture (enrich-in-place)

```text
Upload (PDF/DOCX/TXT)
  → extractTextFromUpload (full text; no aggressive pre-truncation for AI)
  → store original bytes in private Supabase Storage
  → runCvExtraction (low temperature, strict JSON schema, professional HE prompt)
  → mergeCvIntoEmployee (domain/application):
       fill empty fields | union lists | open conflicts | append histories | unmappedFacts
  → persist EmployeeRecord + document metadata
  → return minimal summary to candidate UI
  → pendingConflicts fed into candidate chat intake
```

Layers stay Clean Architecture:

- **Domain:** merge rules, conflict types, history types, authorization predicates for document access.
- **Application:** `applyCvExtraction` / merge orchestration; chat conflict resolution use case.
- **Infrastructure:** Storage upload, text extract, Gemini extraction, HTTP routes, UI.

## Data model

### Active card (`CandidateCard`)

Remains the flat “resolved” view used by matching and existing UI. New CV-specific structures live on **`EmployeeRecord`** (not inside every matching hot path on `card`), serialized with the employee profile JSON:

| Field | Purpose |
|---|---|
| `workHistory[]` | `{ company, title, startDate, endDate, isCurrent?, description, achievements[] }` |
| `educationHistory[]` | `{ institution, degreeOrProgram, fieldOfStudy?, startDate?, endDate?, details? }` |
| `unmappedFacts[]` | `{ label, value, confidence }` — any explicit CV fact with no fixed field |
| `fieldEvidence[]` | `{ fieldKey, value, source: cv\|chat\|user, confidence?, at, documentId? }` |
| `conflicts[]` | `{ id, fieldKey, values: [{ value, source, at }], status: pending\|resolved, resolvedValue? }` |
| `documents[]` | `{ id, kind: "cv", fileName, mimeType, byteSize, storageKey, uploadedAt, textCharCount, extractedText }` |

`documents[].extractedText` holds the full plain-text extract for re-analysis / audit.  
`card.narrative` = short professional summary from the AI only — never the full raw CV dump.

### Merge rules

1. Empty card field + CV value → set card + add `fieldEvidence` (`source: cv`).
2. Same value already present → add evidence only.
3. Different value → **do not overwrite** card; create/update `conflict` with both values; card keeps prior value until chat resolves.
4. Array fields (`skills`, `softSkills`, `languages`, …) → union; attach evidence where practical.
5. Histories → append/dedupe by company+title+dates (best-effort); never drop entries.
6. Anything not mappable → `unmappedFacts` (zero-loss requirement).

### Card field coverage

Extend `CandidateCard` / `candidatePatchSchema` / `CANDIDATE_FIELD_META` only for fields needed for common CV coverage and product use. Remaining facts go to `unmappedFacts` / `extras` to avoid endless DDL. Matching continues to use structured fields + narrative.

## AI extraction (emphasis)

- Provider: existing Gemini via `generateObject` + Zod schema (swappable heuristic fallback).
- `temperature`: low (~0.1–0.2).
- System prompt (Hebrew): professional recruiter/intake analyst; extract **only** explicit content; maximize field coverage; produce work/education histories; put leftovers in `unmappedFacts`; assign confidence `high|medium|low` when ambiguous; never invent.
- Input: full CV text + current card JSON (for awareness; merge logic still enforces no silent overwrite).
- Output schema: full candidate patch + histories + unmappedFacts + per-field confidence where useful.
- On AI failure: keep uploaded file + raw text; surface partial/failed extraction to user; heuristic is minimal fallback only — do not pretend deep analysis succeeded.

## Storage & APIs

- **Bucket:** private Supabase Storage (e.g. `candidate-cvs`). Paths scoped by `userId` + document id.
- **POST `/api/cv`:** upload → extract → store → deep extract → merge → return `{ ok, provider, summary: { fieldsUpdated, rolesFound, conflictsPending, fileName } }` (no full card dump to candidate client beyond what already exists for session needs).
- **GET document:** authorized download/stream; never public URLs.
- Env: reuse Supabase project credentials; document any new Storage keys in `.env.example`.

## Authorization (FR-CV-05)

| Actor | Access |
|---|---|
| Admin | Always: metadata + download + full card/evidence/conflicts |
| Employer | Only if a `matches` row exists for that employer’s job and this candidate with status `queued` or `approved` |
| Candidate | Know upload succeeded (file name + date + minimal counts); no full internal extraction dump |
| Others | 403 |

Enforcement is server-side on every document read.

## UX

### Candidate (after upload)

Minimal copy, e.g. “CV received · ~N details updated · M roles in history”. If conflicts: “We’ll clarify a few points in chat.” No full field list (FR-UI-07).

### Admin

Full card, evidence, conflicts, CV download.

### Employer

CV view/download for matched candidates; profile presentation consistent with current employer candidate UI (no need to expose internal provenance machinery).

### Chat (FR-CHAT-*)

Intake receives `pendingConflicts`. Agent asks naturally which value is current (one thread at a time). On answer: mark conflict `resolved`, set active card value, keep both sources in `fieldEvidence`.

## Error handling

| Case | Behavior |
|---|---|
| Unsupported / too large / unreadable | Clear error; card unchanged; no orphan success state |
| Storage failure | Fail the request; do not claim success |
| AI failure after storage | Document retained; extraction marked failed/partial; user informed |
| Unauthorized document access | 403 |

## Testing

Domain/application unit tests (mandatory):

- Merge: empty→fill, same→evidence only, different→conflict without overwrite
- List union for skills-like fields
- History append / zero-loss unmappedFacts
- Document access predicates: admin / matched employer / unmatched / other
- `applyCvExtraction` does not dump full raw text into `narrative`
- Schema accepts workHistory + educationHistory + unmappedFacts

## SRS mapping

| ID | Requirement |
|---|---|
| FR-CV-01 | Upload CV (PDF/DOCX/TXT) and persist original file for later viewing |
| FR-CV-02 | Deep AI analysis fills the candidate profile maximally (fields + histories + unmapped) |
| FR-CV-03 | Provenance + conflicts; no silent overwrite; chat clarifies |
| FR-CV-04 | Candidate sees minimal post-upload summary only |
| FR-CV-05 | Admin always; employer only for candidates in their match (`queued`/`approved`) |

## Implementation notes (out of scope for this doc)

Detailed task breakdown belongs in the implementation plan (`writing-plans`). Expected touch points: `src/domain/types.ts`, merge helpers + tests, `infrastructure/ai/intake.ts` + schemas/prompts, `application/chat.ts` / file-import path, Storage client, `/api/cv` + document GET, employee `FileImport` summary UI, employer/admin CV links, SRS already updated with FR-CV-*.
