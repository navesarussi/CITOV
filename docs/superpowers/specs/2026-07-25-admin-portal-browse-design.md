# Admin portal — AI billing link, engagement stats, entity browser

**Date:** 2026-07-25  
**Status:** Implemented (pending merge)  
**Mapped SRS:** FR-UI-01, FR-UI-03, FR-UI-07, FR-CV-05; **new** FR-ADM-* (to add in SRS on implementation)  
**Approach:** Admin browse APIs + list/detail pages (Option 1)  
**Build order:** B → C → A (easy → hard)

## Goal

Give admins a trustworthy operations surface: a clear path to Google’s real Gemini billing UI, aggregate engagement stats (how much candidates/jobs actually share via chat), and a high-quality read-only browser for full candidate / employer / job records.

## Non-goals

- Google Cloud / Gemini Billing API integration or automatic prepaid balance sync
- Manual entry of Google top-ups in-app
- Changing the internal AI cost estimate formula in this pass
- Average chat duration (deferred)
- Editing candidate/job cards from the admin portal
- Search/filter/sort polish beyond a usable list (optional later)
- CSV export, “stuck candidate” alerts (future ideas only)

## Architecture

```
Admin UI (/admin, /admin/candidates/..., /admin/employers/...)
    → assertAdmin-gated APIs under /api/admin/...
        → application use cases (dashboard stats, list/detail view-models)
            → domain pure helpers (knowledge %, user-message counts, averages)
                → readStore() / existing store shapes (no new persisted metric columns)
```

- Direction of dependencies unchanged: Infrastructure → Application → Domain.
- Derived metrics are **computed on read** from cards + chats; do not add DB columns for averages.
- Detail payloads include full cards and chats; list endpoints return summaries only (avoid loading all chats into one dashboard response).

---

## Phase B — Google billing link

### Behavior

- Keep the existing **“עלות AI (הערכה)”** StatCard (estimated USD from stored token usage + call/token counts).
- Add an external link next to/under that card: **open Google Gemini billing/usage dashboard** in a new tab.
- Short helper copy: in-app figure is an **internal estimate**; prepaid balance and actual charges live in Google.
- Default URL target: Google AI Studio usage/billing (confirm exact URL at implement time against the project’s billing UI). No secrets required.

### Out of scope for B

- Fetching A$ balance, top-ups, or invoices from Google.

---

## Phase C — Engagement statistics

### Definitions

Exclude demo users (`isDemoUserId`) consistently with existing `computeAdminStats`.

| Metric | Definition |
|--------|------------|
| Avg candidate knowledge % | Mean of `knowledgePercent(candidateRows(card))` over real employees |
| Avg job knowledge % | Mean of `knowledgePercent(jobRows(card))` over every real employer’s `jobs[]` slots |
| Avg user messages — candidates | Mean count of chat messages with `role === "user"` per employee chat |
| Avg user messages — employers | Per employer: mean user-message count across that employer’s job chats; then mean across employers |

**Deferred:** average chat duration.

### UI

- Extend the admin home StatCards / summary section with the four metrics above (Hebrew labels aligned with product language: “ידע רלוונטי” / “רמת התאמה” as used in employee UI for the same underlying %).

### Per-entity derived fields (for cards in Phase A)

Computed at read time:

- **Candidate:** knowledge %, flexibility, user message count  
- **Job:** knowledge %, flexibility, user message count  
- **Employer:** job count, mean user messages across jobs, optional mean knowledge % across jobs  

---

## Phase A — Full entity browser

### Routes (UI)

| Path | Purpose |
|------|---------|
| `/admin` | Existing dashboard + Phase B link + Phase C stats + nav to lists |
| `/admin/candidates` | Candidate list (summary columns) |
| `/admin/candidates/[userId]` | Full candidate detail |
| `/admin/employers` | Employer list |
| `/admin/employers/[userId]` | Employer summary + job list |
| `/admin/employers/[userId]/jobs/[jobId]` | Full job detail |

### Candidate detail (read-only)

- Full `CandidateCard` including extras (all available fields)
- Metrics: knowledge %, flexibility, user message count
- Matches for that candidate: status + fit score + job/employer refs as available
- Full chat history
- CV view/download when present (FR-CV-05: admins always allowed)

### Employer page

- Basic identity/metadata + employer-level metrics
- List of jobs → navigate to job detail page (not inline expand of full chats)

### Job detail

- Full `JobCard` + job metrics
- Matches for that job
- Full job chat history

### APIs

All require `assertAdmin`; return `{ error }` with appropriate status on failure.

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/admin/stats` | Extended dashboard (existing prompts + stats including Phase C) — keep current shape compatible where practical |
| GET | `/api/admin/candidates` | Summary list |
| GET | `/api/admin/candidates/[id]` | Detail view-model |
| GET | `/api/admin/employers` | Summary list |
| GET | `/api/admin/employers/[id]` | Employer + job summaries |
| GET | `/api/admin/employers/[id]/jobs/[jobId]` | Job detail view-model |

Application layer builds view-models; domain owns pure metric helpers + unit tests.

### UI quality bar

- Dedicated pages (not a cramped modal): scannable sections, RTL-first Hebrew copy, reuse `AdminShell` / existing design tokens.
- Lists must remain usable as the store grows (summaries only; no full chat in list payload).

---

## Error handling & auth

- Non-admin: same guard behavior as existing `/api/admin/*`.
- Missing id: 404-style `{ error }` via existing `ok`/`fail` helpers.
- Admin portal must not hang indefinitely (FR-UI-03): timeouts / retry already used on `/admin`; mirror on new list/detail fetches.

## Testing

- Domain unit tests for: knowledge averages, user-message counts, employer-level mean-across-jobs, demo exclusion.
- Application tests for view-model shape on fixture stores (candidate detail includes chat + matches; job scoped to employer).
- No requirement for E2E in this pass unless already patterned in repo.

## SRS updates (on implementation)

Add under FR-UI or new **FR-ADM**:

| ID | Requirement |
|----|-------------|
| FR-ADM-01 | Admin portal links to Google Gemini billing/usage for actual charges/balance |
| FR-ADM-02 | Admin portal shows avg candidate/job knowledge % and avg user message counts (candidate + employer) |
| FR-ADM-03 | Admins can browse full candidate, employer, and job records (card, metrics, matches, chat; CV for candidates) via dedicated admin routes |

## Future ideas (explicitly not in this plan)

- Search / filter / sort lists by knowledge % or message count
- “Stuck” candidates: low knowledge % + high user message count
- CSV export
- Chat duration metrics
- Live Google prepaid balance via API
- In-admin card editing

## Implementation order

1. Phase B — billing link + copy on `/admin`
2. Phase C — domain metrics + extend `computeAdminStats` / dashboard UI
3. Phase A — APIs + list/detail pages
4. Update `docs/SSOT/SRS.md` with FR-ADM-*
)
