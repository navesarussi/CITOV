# Employee workspace — mobile fit, compact CV, profile card, locale display

**Date:** 2026-07-24  
**Status:** Approved for implementation (pending user review of this file)  
**Mapped SRS:** FR-UI-01, FR-UI-05, FR-UI-07, FR-UI-08, FR-CV-01–04  
**Approach:** Compact sidebar + fit viewport (Option A)

## Goal

Make the employee chat workspace feel native on mobile web and fixed-height on desktop: no page scroll, height-driven layout, collapsed CV after upload, collapsible profile with knowledge bar + flexibility when open, and display text translated to the UI locale.

## Non-goals

- Changing matching algorithms or flexibility semantics
- Redesigning employer/admin workspaces in this pass
- Translating the stored original CV file bytes
- Restoring the circular knowledge ring

## Layout & viewport

### Viewport / zoom

- Set viewport meta so mobile browsers do not allow pinch-zoom that breaks the fit layout (`maximum-scale=1`, `user-scalable=no`), while keeping accessible tap targets.
- Size the shell with `100dvh` so mobile browser chrome does not cause unexpected page scroll.

### Structure (top → bottom)

1. **Workspace header** — existing: brand, settings, tabs
2. **Flow steps bar** — flush under the header; compact, polished step indicators (number/check + label + connector)
3. **Content region** — fills remaining height; **no document/page scroll** on the chat tab

### Desktop

- Two-column grid: sidebar (CV + profile) | chat hero
- Chat column fills remaining height; messages scroll inside the chat panel only

### Mobile web

- Same logical order stacked: collapsed CV row → profile card → chat taking remaining height
- Element heights scale with viewport; avoid overflow of the shell

### Remove

- Chat hero title and lead copy: “שיחה חכמה עם הסוכן” / “אחרי העלאת קו״ח — …” (and EN equivalents)

## CV panel (step 1)

### Before upload

- Full sidebar upload UI (existing `FileImport` sidebar variant)

### After CV captured

- Collapse to a compact status row:
  - Success indicator + filename (or “CV captured” fallback)
  - Control: “Change CV” / replace
- Expanding the row reveals the upload control again
- After a successful replace + analysis, return to collapsed status row

### Constraint

- Changing CV always requires opening the collapsed panel (no always-visible large dropzone after first capture)

## Profile card (step 2)

Aligned with **FR-UI-07** (knowledge %) and **FR-UI-08** (flexibility).

### Collapsed (default)

- Card title (“Your card” / localized)
- **Horizontal knowledge bar** (not a ring): fill width = knowledge %, numeric `%` label
- Expand affordance (chevron)

### Expanded

- Same header + knowledge bar
- Mini profile field list (existing mini-card lines)
- **Flexibility slider** 1–10 (persist via existing `/api/flexibility`)
- Collapse affordance

### Scroll

- Internal scroll only when expanded content exceeds available sidebar/card height

## Locale-aligned display (translation)

When UI locale ≠ detected CV/content language:

1. Translate **post-upload capture summary** text shown to the candidate into the UI locale before display
2. Translate **profile card field values** shown in the mini card into the UI locale before display

When languages match: skip translation.

### Rules

- Translation happens server-side (AI) after CV analyze / when serving display-facing summary and card values
- Original uploaded file remains stored unchanged
- UI chrome strings stay on i18n catalogs (no change to that path)
- Matching continues to use structured card data as today; this pass is about **display** language for the candidate

### Out of scope for v1 of this item

- Re-translating live chat history messages already stored
- Employer-facing views of the same card (can reuse later)

## Acceptance criteria

1. On phone web and desktop chat tab: shell does not page-scroll; chat messages scroll inside the panel
2. Pinch-zoom does not enlarge the employee workspace layout on mobile
3. After CV upload success, CV UI is a compact row; replace requires expand
4. Flow steps sit flush under header and look intentional (not a floating orphan strip)
5. Profile defaults collapsed with horizontal knowledge bar; expand shows fields + flexibility
6. Chat hero title/lead removed
7. With UI = Hebrew and English CV content, candidate-facing summary + card field values appear in Hebrew (and symmetrically for EN UI / HE CV)

## Primary files (expected)

- `src/app/employee/page.tsx`, `src/components/EmployeeChatLayout.tsx`
- `src/components/CandidateProfileStrip.tsx`, `src/components/FileImport.tsx`
- `src/components/FlexibilitySlider.tsx` (reuse)
- `src/app/globals.css` (fit heights, flow bar, collapsed CV, knowledge bar)
- Viewport meta (root layout / employee shell)
- CV analyze / me display path for locale translation of summary + card values
- `src/i18n/he.ts`, `src/i18n/en.ts` (copy for collapse/expand/change CV)

## Risks

- Over-aggressive zoom lock can hurt accessibility — keep large tap targets and readable type
- Translation latency after analyze — show analyzing state until display-ready payload returns
- `100dvh` quirks on older iOS — fall back with `100vh` where needed
