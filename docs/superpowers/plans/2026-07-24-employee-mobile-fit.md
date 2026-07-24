# Employee Mobile Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fit the employee workspace to mobile/desktop viewport (no page scroll, no pinch-zoom), collapse CV after upload, make the profile card collapsible with a horizontal knowledge bar + flexibility when open, remove the chat hero copy, and translate candidate-facing CV summary/card fields into the UI locale.

**Architecture:** UI changes stay in employee layout components + CSS. Display-locale translation is an application use-case invoked after CV analyze (and when serving card display if needed), using the existing Gemini client; domain stays pure (language heuristics / field picking). Flexibility reuses `FlexibilitySlider` + `/api/flexibility`.

**Tech Stack:** Next.js App Router, React client components, CSS in `globals.css`, Gemini via `ai` SDK, Vitest/node:test as used in repo.

## Global Constraints

- Mapped SRS: FR-UI-01, FR-UI-05, FR-UI-07, FR-UI-08, FR-CV-01–04
- Max ~200 lines per file where practical; no Domain imports from infrastructure
- Docs only in English
- Do not redesign employer/admin in this pass
- Original CV file bytes unchanged; translation is for candidate-facing display fields
- Pinch-zoom lock: viewport `maximum-scale=1, user-scalable=no`
- Shell height: `100dvh` with `100vh` fallback; chat tab has **no page scroll**

---

## File map

| File | Responsibility |
|------|----------------|
| `src/app/layout.tsx` | Export `viewport` to lock zoom |
| `src/app/globals.css` | Fit layout, flow bar flush, collapsed CV, knowledge bar, profile collapse |
| `src/components/EmployeeChatLayout.tsx` | Wire collapsed CV + profile props; remove chat hero header |
| `src/components/FileImport.tsx` | Sidebar: collapse after CV; expand to change |
| `src/components/CandidateProfileStrip.tsx` | Collapsed knowledge bar; expand → fields + flexibility |
| `src/app/employee/page.tsx` | Pass `onFlexibilityChange` / locale as needed |
| `src/domain/display-locale.ts` | Detect if text needs translation to target locale |
| `src/domain/display-locale.test.ts` | Unit tests for heuristic |
| `src/application/translate-candidate-display.ts` | Translate card string fields to locale |
| `src/application/translate-candidate-display.test.ts` | Unit tests (heuristic skip path) |
| `src/infrastructure/ai/intake.ts` or small translate helper | AI translate JSON of field values |
| `src/application/cv-import.ts` + `src/app/api/cv/analyze/route.ts` | Accept locale; translate after extract |
| `src/i18n/he.ts` / `src/i18n/en.ts` | Expand/collapse/change CV strings |

---

### Task 1: Viewport lock + no-scroll shell + flush flow + remove chat hero

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css` (employee-workspace / flow / desktop fit rules)
- Modify: `src/components/EmployeeChatLayout.tsx` (remove `employee-chat-main__header` block)

**Interfaces:**
- Produces: Root `viewport` export; CSS classes that keep `.workspace-shell--employee` within `100dvh` on all widths for chat tab

- [ ] **Step 1: Add viewport export in layout**

```tsx
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

- [ ] **Step 2: Tighten CSS so desktop chat tab also never page-scrolls**

Ensure (not only under `max-width: 959px`):

```css
.workspace-shell--employee {
  height: 100dvh;
  height: 100vh; /* fallback order: put dvh last */
  max-height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.employee-flow {
  /* flush under header: smaller padding, less gap, less “floating card” */
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  box-shadow: none;
  padding: 0.45rem 0.75rem;
}
```

Also remove/hide unused `.employee-chat-main__header` spacing when header is gone.

- [ ] **Step 3: Remove chat hero header from `EmployeeChatLayout`**

Delete the `<header className="employee-chat-main__header">…</header>` block so chat panel starts immediately.

- [ ] **Step 4: Manual check**

Run `npm run build`. Open `/employee` — no page scroll on desktop/mobile width; steps sit under header; no “שיחה חכמה…” title.

- [ ] **Step 5: Commit** (only if user asked; otherwise leave unstaged)

---

### Task 2: Collapsible CV after upload

**Files:**
- Modify: `src/components/FileImport.tsx`
- Modify: `src/app/globals.css` (`.employee-cv-card--collapsed`)
- Modify: `src/i18n/he.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: existing `hasExisting`, `existingFileName`, `cvMode`, `variant="sidebar"`
- Produces: When `hasCv` and not expanded → compact status row; expand to show full upload UI

- [ ] **Step 1: Add i18n keys**

```ts
// he.fileImport
expandCv: "שינוי קו״ח",
collapseCv: "סגור",
cvCaptured: "קו״ח נקלטו",
```

```ts
// en.fileImport
expandCv: "Change CV",
collapseCv: "Close",
cvCaptured: "CV captured",
```

- [ ] **Step 2: Sidebar collapsed UI in `FileImport`**

When `variant === "sidebar"` and `hasCv` and `!expanded` and not `busy`:

```tsx
const [expanded, setExpanded] = useState(false);
// after successful analyze with hasCv, setExpanded(false)
```

Collapsed markup:

```tsx
<div className="employee-cv-card employee-cv-card--collapsed">
  <input … className="hidden" />
  <div className="employee-cv-card__compact">
    <span aria-hidden>✓</span>
    <span className="truncate">{props.existingFileName || t.fileImport.cvCaptured}</span>
    <button type="button" onClick={() => setExpanded(true)}>
      {t.fileImport.expandCv}
    </button>
  </div>
  {summary ? <p className="employee-cv-card__summary">…</p> : null}
</div>
```

When expanded (or no CV): show existing full sidebar card; include a “Close” control when `hasCv`.

- [ ] **Step 3: CSS for compact row**

```css
.employee-cv-card--collapsed {
  padding: 0.5rem 0.75rem;
  margin: 0 0.75rem 0.75rem;
}
.employee-cv-card__compact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
```

- [ ] **Step 4: Verify** — upload/mock `hasExisting` → row collapses; Change CV expands dropzone.

---

### Task 3: Profile card — knowledge bar + collapse + flexibility

**Files:**
- Modify: `src/components/CandidateProfileStrip.tsx`
- Modify: `src/components/EmployeeChatLayout.tsx`
- Modify: `src/app/employee/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/i18n/he.ts`, `src/i18n/en.ts` if needed (`expandCard` / `collapseCard`)

**Interfaces:**
- Consumes: `card`, `userId`, `onFlexibilityChange`
- Produces: collapsed default with horizontal knowledge bar; expanded shows mini fields + `FlexibilitySlider`

- [ ] **Step 1: Rewrite `CandidateProfileStrip`**

```tsx
export function CandidateProfileStrip(props: {
  card: CandidateCard | null | undefined;
  userId: string;
  onFlexibilityChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  // knowledgePercent(candidateRows(...))
  // collapsed: button header + knowledge bar
  // open: fields + FlexibilitySlider + live hint
}
```

Knowledge bar markup:

```tsx
<div
  className="knowledge-bar"
  style={{ ["--knowledge-pct" as string]: `${percent}%` }}
  role="meter"
  aria-valuenow={percent}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={t.profile.knowledge}
>
  <div className="knowledge-bar__fill" />
  <span className="knowledge-bar__label">{fmt(t.profile.knowledgePercent, { percent: String(percent) })}</span>
</div>
```

- [ ] **Step 2: CSS**

```css
.knowledge-bar {
  position: relative;
  height: 0.55rem;
  border-radius: 999px;
  background: var(--chip);
  overflow: hidden;
}
.knowledge-bar__fill {
  height: 100%;
  width: var(--knowledge-pct, 0%);
  background: var(--accent);
  border-radius: inherit;
}
.knowledge-bar__label {
  /* place percent next to title row, not inside thin bar if cramped */
}
```

- [ ] **Step 3: Wire flexibility from `employee/page.tsx`**

Mirror employer page pattern: optimistic card update + existing API via slider.

- [ ] **Step 4: Verify** — default collapsed; expand shows fields + flexibility; slider persists.

---

### Task 4: Translate CV display fields to UI locale

**Files:**
- Create: `src/domain/display-locale.ts`
- Create: `src/domain/display-locale.test.ts`
- Create: `src/application/translate-candidate-display.ts`
- Create: `src/application/translate-candidate-display.test.ts`
- Modify: `src/infrastructure/ai/intake.ts` (or `translate-fields.ts`) — AI helper
- Modify: `src/application/cv-import.ts` — accept `locale`, apply translation
- Modify: `src/app/api/cv/analyze/route.ts` — pass locale from body
- Modify: `src/components/FileImport.tsx` — send `locale` in analyze POST

**Interfaces:**
- `needsTranslationToLocale(sampleText: string, locale: Locale): boolean`
- `translateCandidateCardForDisplay(card: CandidateCard, locale: Locale): Promise<CandidateCard>`
- `analyzeCandidateCv(store, userId, documentId?, locale?)`

- [ ] **Step 1: Domain heuristic + tests**

```ts
export function needsTranslationToLocale(text: string, locale: Locale): boolean {
  const sample = text.trim();
  if (!sample) return false;
  const hebrew = (sample.match(/[\u0590-\u05FF]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (locale === "he") return latin > hebrew * 2 && latin >= 12;
  if (locale === "en") return hebrew > latin * 2 && hebrew >= 8;
  return false;
}
```

- [ ] **Step 2: Application translate (skip if heuristic false; else AI JSON map of string fields)**

Translate keys used by mini card + free-text arrays/strings on `CandidateCard`. On AI failure, return original card.

- [ ] **Step 3: Wire analyze**

`FileImport` analyze body: `{ userId, documentId, locale }`  
`analyzeCandidateCv` after `applyCvExtraction`, if needed translate card and write back into store employees.

Capture summary numbers stay i18n-templated (`cvSummary`); ensuring card `summary` field is translated covers “summary” display. If API returns a localized `summaryMessage`, optional — not required if UI uses `t.fileImport.cvSummary`.

- [ ] **Step 4: Tests** — heuristic pass/fail; translate no-op when same language.

- [ ] **Step 5: Build + smoke** — `npm run build`; upload English CV with HE UI → profile fields Hebrew.

---

### Task 5: Mobile polish pass

**Files:**
- Modify: `src/app/globals.css` mobile `@media (max-width: 959px)` block

- [ ] Ensure collapsed CV + collapsed profile leave max height for chat
- [ ] Sidebar sections shrink; chat `flex: 1; min-height: 0`
- [ ] Touch targets ≥ 44px for expand/collapse buttons
- [ ] Restart `npm run dev` and verify phone width

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Viewport zoom lock + height-driven | Task 1 |
| No page scroll | Task 1, 5 |
| Flow steps flush/prettier | Task 1 |
| Remove chat hero copy | Task 1 |
| CV collapses after capture | Task 2 |
| Knowledge horizontal bar + collapse | Task 3 |
| Flexibility only when open | Task 3 |
| Translate summary + card fields | Task 4 |
| Mobile web fit | Task 5 |

## Placeholder scan

None intentional.
