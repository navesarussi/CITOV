# Deep CV Analysis Implementation Plan

> **For agentic workers:** Use inline execution. Steps use checkbox syntax.

**Goal:** Deep AI CV extraction into candidate profile with file storage, provenance/conflicts, and minimal candidate summary (FR-CV-01…05).

**Architecture:** Enrich-in-place on existing `/api/cv` + `runCvExtraction`. Domain merge rules; Supabase Storage for files; chat consumes pending conflicts.

**Tech Stack:** Next.js, Gemini `generateObject`, Zod, Supabase Storage + Postgres JSONB employee profiles.

## Global Constraints

- Clean Architecture: Domain ← Application ← Infrastructure
- Max ~200 lines/file where practical
- Docs/SRS in English; UI Hebrew via i18n
- Map to FR-CV-01…05
- TDD for domain/application merge + access

## File map

| File | Role |
|---|---|
| `src/domain/types.ts` | Extend `EmployeeRecord` with CV structures |
| `src/domain/cv-merge.ts` | Merge patch + evidence + conflicts + histories |
| `src/domain/cv-access.ts` | Who may download a CV |
| `src/domain/cv-merge.test.ts` / `cv-access.test.ts` | Unit tests |
| `src/infrastructure/ai/schemas.ts` | Extended CV extraction schema |
| `src/infrastructure/ai/intake.ts` | Deep CV system prompt + extraction |
| `src/infrastructure/files/cv-storage.ts` | Upload/download private Storage |
| `src/application/chat.ts` | Replace `applyCvExtraction`; conflict resolution hook |
| `src/app/api/cv/route.ts` | Store file + deep extract + summary response |
| `src/app/api/cv/document/route.ts` | Authorized download |
| `src/components/FileImport.tsx` | Show minimal summary |
| Employer/admin UI | CV link when allowed |

---

### Task 1: Domain types + merge + access (TDD)

- [x] Types on `EmployeeRecord`
- [x] `mergeCvExtraction` + tests
- [x] `canViewCandidateCv` + tests

### Task 2: AI schema + prompt

- [x] Extend extraction schema with histories/unmapped/confidence
- [x] Professional Hebrew CV system prompt

### Task 3: Storage + API

- [x] `cv-storage.ts` (Postgres bytea)
- [x] Wire `/api/cv` + `/api/cv/document`

### Task 4: UX + chat conflicts

- [x] Minimal summary in FileImport
- [x] Feed pendingConflicts into employee intake
- [x] Employer/admin download affordance

### Task 5: Verify

- [x] `npm test` + `tsc --noEmit`
