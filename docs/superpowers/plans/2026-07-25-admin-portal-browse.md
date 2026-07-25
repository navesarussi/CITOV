# Admin Portal Browse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Google Gemini billing link on the admin home, engagement stats (avg knowledge % + avg user messages), and a read-only admin browser for full candidate / employer / job records.

**Architecture:** Pure domain helpers compute knowledge % and user-message metrics on read. Application layer builds list/detail view-models. Thin `assertAdmin` API routes under `/api/admin/*`. New App Router pages under `/admin/candidates` and `/admin/employers`. No new persisted metric columns; no Google Billing API.

**Tech Stack:** Next.js App Router 16, React 19, existing `AdminShell`, `node:test` via `tsx --test`, Hebrew UI copy inline (admin pages today are Hebrew-first; keep that pattern).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-admin-portal-browse-design.md`
- Mapped SRS: FR-UI-01, FR-UI-03, FR-UI-07, FR-CV-05; add FR-ADM-01..03 on implementation
- Build order: Phase B → C → A
- Max ~200 lines per file where practical; split rather than grow `admin/page.tsx` (already ~312 lines)
- Domain must not import infrastructure or `node_modules` UI/DB clients
- Exclude demo users via `isDemoUserId` from `@/domain/admin`
- Docs only in English
- Do not implement: Billing API, chat duration, in-admin card editing, search/CSV

---

## File map

| File | Responsibility |
|------|----------------|
| `src/domain/admin-engagement.ts` | Pure: user message count, knowledge %, means, per-entity metrics |
| `src/domain/admin-engagement.test.ts` | Unit tests for engagement helpers |
| `src/domain/admin.ts` | Extend `AdminStats` + `computeAdminStats` with engagement fields |
| `src/domain/admin.test.ts` | Extend stats tests |
| `src/application/admin-browse.ts` | List/detail view-models for candidates, employers, jobs |
| `src/application/admin-browse.test.ts` | View-model tests |
| `src/app/api/admin/candidates/route.ts` | Refactor list to summaries via application layer |
| `src/app/api/admin/candidates/[id]/route.ts` | Candidate detail |
| `src/app/api/admin/candidates/[id]/cv/[documentId]/route.ts` | Admin-only CV download (`assertAdmin`) |
| `src/app/api/admin/employers/route.ts` | Employer list |
| `src/app/api/admin/employers/[id]/route.ts` | Employer detail + job summaries |
| `src/app/api/admin/employers/[id]/jobs/[jobId]/route.ts` | Job detail |
| `src/app/admin/page.tsx` | Billing link + new stat cards + nav to lists; extract helpers if needed |
| `src/components/admin/AdminStatCard.tsx` | Shared stat card (extract from page) |
| `src/app/admin/candidates/page.tsx` | Candidate list UI |
| `src/app/admin/candidates/[id]/page.tsx` | Candidate detail UI |
| `src/app/admin/employers/page.tsx` | Employer list UI |
| `src/app/admin/employers/[id]/page.tsx` | Employer + jobs list UI |
| `src/app/admin/employers/[id]/jobs/[jobId]/page.tsx` | Job detail UI |
| `src/components/AdminShell.tsx` | Optional nav links to candidates/employers |
| `docs/SSOT/SRS.md` | FR-ADM-01..03 |

**Constant:** Google billing URL = `https://aistudio.google.com/usage` (Usage/Billing in AI Studio; opens in new tab).

---

### Task 1: Domain engagement helpers (TDD)

**Files:**
- Create: `src/domain/admin-engagement.ts`
- Create: `src/domain/admin-engagement.test.ts`

**Interfaces:**
- Consumes: `knowledgePercent`, `candidateRows`, `jobRows` from `@/domain/card-progress`; types from `@/domain/types`; `isDemoUserId` from `@/domain/admin`
- Produces:
  - `countUserMessages(chat: ChatMessage[]): number`
  - `candidateKnowledgePercent(card: CandidateCard): number`
  - `jobKnowledgePercent(card: JobCard): number`
  - `mean(nums: number[]): number` — `0` if empty
  - `candidateEngagement(emp: EmployeeRecord): { knowledgePercent: number; userMessageCount: number; flexibility: number }`
  - `jobEngagement(job: JobSlot): { knowledgePercent: number; userMessageCount: number; flexibility: number }`
  - `employerEngagement(er: EmployerRecord): { jobCount: number; avgUserMessages: number; avgKnowledgePercent: number }`
  - `storeEngagementStats(store: StoreData): { avgCandidateKnowledgePercent: number; avgJobKnowledgePercent: number; avgCandidateUserMessages: number; avgEmployerUserMessages: number }`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countUserMessages,
  mean,
  storeEngagementStats,
  employerEngagement,
} from "./admin-engagement";
import type { StoreData } from "./types";
import { emptyCandidateCard, emptyJobCard } from "./types";
import { normalizeEmployerRecord, createJobSlot } from "./employer-jobs";

describe("admin-engagement", () => {
  it("counts only user-role messages", () => {
    assert.equal(
      countUserMessages([
        { id: "1", role: "assistant", content: "a", createdAt: "t" },
        { id: "2", role: "user", content: "b", createdAt: "t" },
        { id: "3", role: "user", content: "c", createdAt: "t" },
      ]),
      2,
    );
  });

  it("mean of empty is 0", () => {
    assert.equal(mean([]), 0);
  });

  it("averages knowledge and user messages excluding demo", () => {
    const filled = { ...emptyCandidateCard(), desiredRole: "Dev", field: "Tech", location: "TLV" };
    const store: StoreData = {
      users: [],
      employees: [
        {
          userId: "demo-employee",
          card: filled,
          chat: [{ id: "1", role: "user", content: "x", createdAt: "t" }],
          pendingFieldQuestionIds: [],
        },
        {
          userId: "c1",
          card: filled,
          chat: [
            { id: "1", role: "user", content: "x", createdAt: "t" },
            { id: "2", role: "assistant", content: "y", createdAt: "t" },
            { id: "3", role: "user", content: "z", createdAt: "t" },
          ],
          pendingFieldQuestionIds: [],
        },
      ],
      employers: [
        normalizeEmployerRecord({
          userId: "e1",
          card: emptyJobCard(),
          chat: [],
          jobs: [
            createJobSlot({
              id: "j1",
              card: { ...emptyJobCard(), title: "A", field: "Tech" },
              chat: [{ id: "1", role: "user", content: "u", createdAt: "t" }],
            }),
            createJobSlot({
              id: "j2",
              card: emptyJobCard(),
              chat: [
                { id: "1", role: "user", content: "u", createdAt: "t" },
                { id: "2", role: "user", content: "v", createdAt: "t" },
              ],
            }),
          ],
          activeJobId: "j1",
        }),
      ],
      fieldQuestions: [],
      fieldAnswers: [],
      matches: [],
    };
    const s = storeEngagementStats(store);
    assert.equal(s.avgCandidateUserMessages, 2);
    assert.ok(s.avgCandidateKnowledgePercent > 0);
    assert.equal(s.avgEmployerUserMessages, 1.5); // (1+2)/2
    assert.ok(s.avgJobKnowledgePercent >= 0);
  });

  it("employerEngagement averages across jobs", () => {
    const er = normalizeEmployerRecord({
      userId: "e1",
      card: emptyJobCard(),
      chat: [],
      jobs: [
        createJobSlot({
          id: "j1",
          chat: [{ id: "1", role: "user", content: "a", createdAt: "t" }],
        }),
        createJobSlot({
          id: "j2",
          chat: [
            { id: "1", role: "user", content: "a", createdAt: "t" },
            { id: "2", role: "user", content: "b", createdAt: "t" },
          ],
        }),
      ],
      activeJobId: "j1",
    });
    const e = employerEngagement(er);
    assert.equal(e.jobCount, 2);
    assert.equal(e.avgUserMessages, 1.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/domain/admin-engagement.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
import { candidateRows, jobRows, knowledgePercent } from "@/domain/card-progress";
import { isDemoUserId } from "@/domain/admin";
import type {
  CandidateCard,
  ChatMessage,
  EmployeeRecord,
  EmployerRecord,
  JobCard,
  JobSlot,
  StoreData,
} from "@/domain/types";

export function countUserMessages(chat: ChatMessage[]): number {
  return chat.filter((m) => m.role === "user").length;
}

export function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function candidateKnowledgePercent(card: CandidateCard): number {
  return knowledgePercent(candidateRows(card));
}

export function jobKnowledgePercent(card: JobCard): number {
  return knowledgePercent(jobRows(card));
}

export function candidateEngagement(emp: EmployeeRecord) {
  return {
    knowledgePercent: candidateKnowledgePercent(emp.card),
    userMessageCount: countUserMessages(emp.chat),
    flexibility: emp.card.flexibility,
  };
}

export function jobEngagement(job: JobSlot) {
  return {
    knowledgePercent: jobKnowledgePercent(job.card),
    userMessageCount: countUserMessages(job.chat),
    flexibility: job.card.flexibility,
  };
}

export function employerEngagement(er: EmployerRecord) {
  const jobs = er.jobs ?? [];
  const msgs = jobs.map((j) => countUserMessages(j.chat));
  const knowledge = jobs.map((j) => jobKnowledgePercent(j.card));
  return {
    jobCount: jobs.length,
    avgUserMessages: mean(msgs),
    avgKnowledgePercent: mean(knowledge),
  };
}

export function storeEngagementStats(store: StoreData) {
  const employees = store.employees.filter((e) => !isDemoUserId(e.userId));
  const employers = store.employers.filter((e) => !isDemoUserId(e.userId));
  const jobs = employers.flatMap((e) => e.jobs ?? []);

  return {
    avgCandidateKnowledgePercent: mean(employees.map((e) => candidateKnowledgePercent(e.card))),
    avgJobKnowledgePercent: mean(jobs.map((j) => jobKnowledgePercent(j.card))),
    avgCandidateUserMessages: mean(employees.map((e) => countUserMessages(e.chat))),
    avgEmployerUserMessages: mean(employers.map((e) => employerEngagement(e).avgUserMessages)),
  };
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npx tsx --test src/domain/admin-engagement.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/admin-engagement.ts src/domain/admin-engagement.test.ts
git commit -m "feat(admin): add engagement metric helpers for knowledge and messages"
```

---

### Task 2: Extend `computeAdminStats` with engagement fields

**Files:**
- Modify: `src/domain/admin.ts`
- Modify: `src/domain/admin.test.ts`

**Interfaces:**
- Consumes: `storeEngagementStats` from Task 1
- Produces: `AdminStats.aiUsage` unchanged; add:
  ```ts
  engagement: {
    avgCandidateKnowledgePercent: number;
    avgJobKnowledgePercent: number;
    avgCandidateUserMessages: number;
    avgEmployerUserMessages: number;
  }
  ```

- [ ] **Step 1: Extend failing assertion in `admin.test.ts`**

In the existing `"computes stats excluding demo users"` test, after computing `stats`, add:

```ts
assert.ok("engagement" in stats);
assert.equal(typeof stats.engagement.avgCandidateKnowledgePercent, "number");
assert.equal(typeof stats.engagement.avgCandidateUserMessages, "number");
```

- [ ] **Step 2: Run test — expect FAIL on missing `engagement`**

Run: `npx tsx --test src/domain/admin.test.ts`

- [ ] **Step 3: Wire into `computeAdminStats`**

```ts
import { storeEngagementStats } from "@/domain/admin-engagement";

// inside computeAdminStats return:
engagement: storeEngagementStats(store),
```

Update `AdminStats` type accordingly.

- [ ] **Step 4: Run tests — PASS**

Run: `npx tsx --test src/domain/admin.test.ts src/domain/admin-engagement.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/domain/admin.ts src/domain/admin.test.ts
git commit -m "feat(admin): include engagement averages in admin stats"
```

---

### Task 3: Phase B + C on admin home UI

**Files:**
- Create: `src/components/admin/AdminStatCard.tsx`
- Modify: `src/app/admin/page.tsx` — types, StatCards, billing link, nav links; keep under ~200 lines by extracting `AdminStatCard` and optionally a small `AdminDashboardNav`

**Interfaces:**
- Consumes: extended `stats` from `/api/admin/stats` (already returns `getAdminDashboard` → `computeAdminStats`)
- Produces: UI only

- [ ] **Step 1: Extract `AdminStatCard`**

```tsx
export function AdminStatCard(props: {
  label: string;
  value: string | number;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel rounded-[var(--panel-radius)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]">
      <p className="text-sm text-[var(--muted)]">{props.label}</p>
      <p className="mt-1 text-3xl font-bold text-[var(--hero)]">{props.value}</p>
      {props.sub ? <p className="mt-1 text-xs text-[var(--muted)]">{props.sub}</p> : null}
      {props.children}
    </div>
  );
}
```

Replace local `StatCard` in `page.tsx` with this import.

- [ ] **Step 2: Extend `AdminStats` type on the client to include `engagement`**

Match server shape from Task 2.

- [ ] **Step 3: Update AI cost card (Phase B)**

On the AI cost `AdminStatCard`, add:

```tsx
<p className="mt-2 text-xs text-[var(--muted)]">
  הערכה פנימית מטוקנים — יתרה ותשלומים בפועל ב־Google.
</p>
<a
  href="https://aistudio.google.com/usage"
  target="_blank"
  rel="noopener noreferrer"
  className="mt-2 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
>
  פתיחת חיוב / שימוש Google Gemini
</a>
```

- [ ] **Step 4: Add engagement StatCards (Phase C)**

After the existing grid, add cards (round knowledge to integer; messages to 1 decimal):

- ממוצע ידע רלוונטי — מועמדים → `avgCandidateKnowledgePercent`
- ממוצע ידע רלוונטי — משרות → `avgJobKnowledgePercent`
- ממוצע הודעות משתמש — מועמדים → `avgCandidateUserMessages`
- ממוצע הודעות משתמש — מעסיקים → `avgEmployerUserMessages`

- [ ] **Step 5: Add nav links**

```tsx
<nav className="mt-4 flex flex-wrap gap-3 text-sm">
  <Link href="/admin/candidates" className="text-[var(--accent)] hover:underline">
    דפדפן מועמדים
  </Link>
  <Link href="/admin/employers" className="text-[var(--accent)] hover:underline">
    דפדפן מעסיקים
  </Link>
</nav>
```

(Links may 404 until Task 6 — that is OK if implementing sequentially in one session; otherwise add stub pages that say “בקרוב” only if shipping B+C alone.)

- [ ] **Step 6: Manual smoke**

Run: `npm run dev` → open `/admin` as admin → confirm stats load, link opens AI Studio, new cards show numbers.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/AdminStatCard.tsx src/app/admin/page.tsx
git commit -m "feat(admin): show Gemini billing link and engagement stats"
```

---

### Task 4: Application browse view-models (TDD)

**Files:**
- Create: `src/application/admin-browse.ts`
- Create: `src/application/admin-browse.test.ts`

**Interfaces:**
- Consumes: Task 1 engagement helpers; `isDemoUserId`; store types; `normalizeEmployerRecord` if needed
- Produces:
  ```ts
  export type AdminMatchSummary = {
    id: string;
    jobOwnerId: string;
    jobId: string;
    candidateId: string;
    score: number; // 0–1 as stored
    scorePercent: number; // Math.round(score * 100)
    reason: string;
    status: MatchStatus;
  };

  export type AdminCandidateSummary = {
    userId: string;
    name: string;
    email: string | null;
    knowledgePercent: number;
    userMessageCount: number;
    flexibility: number;
    hasCv: boolean;
  };

  export type AdminCandidateDetail = AdminCandidateSummary & {
    card: CandidateCard;
    chat: ChatMessage[];
    matches: AdminMatchSummary[];
    cvDocuments: { id: string; fileName: string; uploadedAt: string; byteSize: number }[];
  };

  export type AdminJobSummary = {
    jobId: string;
    title: string;
    knowledgePercent: number;
    userMessageCount: number;
    flexibility: number;
  };

  export type AdminEmployerSummary = {
    userId: string;
    name: string;
    email: string | null;
    jobCount: number;
    avgUserMessages: number;
    avgKnowledgePercent: number;
  };

  export type AdminEmployerDetail = AdminEmployerSummary & {
    jobs: AdminJobSummary[];
  };

  export type AdminJobDetail = AdminJobSummary & {
    employerId: string;
    employerName: string;
    card: JobCard;
    chat: ChatMessage[];
    matches: AdminMatchSummary[];
  };

  export function listAdminCandidates(store: StoreData): AdminCandidateSummary[];
  export function getAdminCandidateDetail(store: StoreData, userId: string): AdminCandidateDetail | null;
  export function listAdminEmployers(store: StoreData): AdminEmployerSummary[];
  export function getAdminEmployerDetail(store: StoreData, userId: string): AdminEmployerDetail | null;
  export function getAdminJobDetail(store: StoreData, employerId: string, jobId: string): AdminJobDetail | null;
  ```

- [ ] **Step 1: Write failing tests**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listAdminCandidates,
  getAdminCandidateDetail,
  listAdminEmployers,
  getAdminJobDetail,
} from "./admin-browse";
import type { StoreData } from "@/domain/types";
import { emptyCandidateCard, emptyJobCard } from "@/domain/types";
import { normalizeEmployerRecord, createJobSlot } from "@/domain/employer-jobs";

function baseStore(): StoreData {
  return {
    users: [
      { id: "c1", name: "Nave", role: "employee", email: "n@x.com", createdAt: "t" },
      { id: "e1", name: "Boss", role: "employer", email: "b@x.com", createdAt: "t" },
    ],
    employees: [
      {
        userId: "c1",
        card: { ...emptyCandidateCard(), desiredRole: "Dev" },
        chat: [{ id: "1", role: "user", content: "hi", createdAt: "t" }],
        pendingFieldQuestionIds: [],
        cv: {
          workHistory: [],
          educationHistory: [],
          unmappedFacts: [],
          fieldEvidence: [],
          conflicts: [],
          documents: [
            {
              id: "d1",
              kind: "cv",
              fileName: "cv.pdf",
              mimeType: "application/pdf",
              byteSize: 10,
              storageKey: "k",
              uploadedAt: "t",
              textCharCount: 1,
              extractedText: "x",
            },
          ],
        },
      },
      {
        userId: "demo-employee",
        card: emptyCandidateCard(),
        chat: [],
        pendingFieldQuestionIds: [],
      },
    ],
    employers: [
      normalizeEmployerRecord({
        userId: "e1",
        card: emptyJobCard(),
        chat: [],
        jobs: [
          createJobSlot({
            id: "j1",
            card: { ...emptyJobCard(), title: "Seller" },
            chat: [{ id: "1", role: "user", content: "need", createdAt: "t" }],
          }),
        ],
        activeJobId: "j1",
      }),
    ],
    fieldQuestions: [],
    fieldAnswers: [],
    matches: [
      {
        id: "m1",
        jobOwnerId: "e1",
        jobId: "j1",
        candidateId: "c1",
        score: 0.42,
        reason: "ok",
        status: "queued",
        createdAt: "t",
        updatedAt: "t",
      },
    ],
  };
}

describe("admin-browse", () => {
  it("lists real candidates with metrics and excludes demo", () => {
    const list = listAdminCandidates(baseStore());
    assert.equal(list.length, 1);
    assert.equal(list[0]!.userId, "c1");
    assert.equal(list[0]!.userMessageCount, 1);
    assert.equal(list[0]!.hasCv, true);
  });

  it("returns candidate detail with chat, matches, cv meta", () => {
    const d = getAdminCandidateDetail(baseStore(), "c1");
    assert.ok(d);
    assert.equal(d!.chat.length, 1);
    assert.equal(d!.matches[0]!.scorePercent, 42);
    assert.equal(d!.cvDocuments[0]!.id, "d1");
  });

  it("returns null for unknown candidate", () => {
    assert.equal(getAdminCandidateDetail(baseStore(), "nope"), null);
  });

  it("lists employers and job detail", () => {
    assert.equal(listAdminEmployers(baseStore()).length, 1);
    const job = getAdminJobDetail(baseStore(), "e1", "j1");
    assert.ok(job);
    assert.equal(job!.title, "Seller");
    assert.equal(job!.matches.length, 1);
    assert.equal(job!.userMessageCount, 1);
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx tsx --test src/application/admin-browse.test.ts`

- [ ] **Step 3: Implement `admin-browse.ts`**

Map users by id for name/email. Filter `!isDemoUserId`. Sort lists by `name.localeCompare(..., "he")`.  
For matches on candidate: `store.matches.filter(m => m.candidateId === userId)`.  
For job: `m.jobOwnerId === employerId && m.jobId === jobId`.  
Do **not** put `extractedText` in CV documents list (metadata only).

Keep file ≤200 lines; if needed split match-mapping helpers in the same file as small functions.

- [ ] **Step 4: Run — PASS**

Run: `npx tsx --test src/application/admin-browse.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/application/admin-browse.ts src/application/admin-browse.test.ts
git commit -m "feat(admin): add browse view-models for candidates and employers"
```

---

### Task 5: Admin browse + CV download API routes

**Files:**
- Modify: `src/app/api/admin/candidates/route.ts` — use `listAdminCandidates`
- Create: `src/app/api/admin/candidates/[id]/route.ts`
- Create: `src/app/api/admin/candidates/[id]/cv/[documentId]/route.ts`
- Create: `src/app/api/admin/employers/route.ts`
- Create: `src/app/api/admin/employers/[id]/route.ts`
- Create: `src/app/api/admin/employers/[id]/jobs/[jobId]/route.ts`

**Interfaces:**
- Consumes: Task 4 functions; `assertAdmin`; `readStore`; `findCandidateDocument` + `readCandidateDocumentBlob` for CV
- Produces: JSON via `ok` / `fail`; CV as binary Response

Next.js 16 dynamic params: `ctx: { params: Promise<{ id: string }> }` then `const { id } = await ctx.params`.

- [ ] **Step 1: Refactor candidates list route**

```ts
import { listAdminCandidates } from "@/application/admin-browse";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

export async function GET() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const store = await readStore();
    return ok({ candidates: listAdminCandidates(store) });
  } catch (e) {
    return fail(e);
  }
}
```

- [ ] **Step 2: Candidate detail route**

```ts
import { getAdminCandidateDetail } from "@/application/admin-browse";
// ...
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const { id } = await ctx.params;
    const store = await readStore();
    const detail = getAdminCandidateDetail(store, id);
    if (!detail) return ok({ error: "מועמד לא נמצא" }, { status: 404 });
    return ok({ candidate: detail });
  } catch (e) {
    return fail(e);
  }
}
```

- [ ] **Step 3: Admin CV download route**

Use `assertAdmin` only (do not require `authorizeActor` viewerId — admins may lack a store user matching the session). Lookup document via `findCandidateDocument(store, id, documentId)`, then `readCandidateDocumentBlob(meta.storageKey)`. Return same headers as `/api/cv/document`. Set `export const runtime = "nodejs"`.

- [ ] **Step 4: Employer list / detail / job detail routes**

Same guard pattern; 404 Hebrew errors: `"מעסיק לא נמצא"`, `"משרה לא נמצאה"`.

- [ ] **Step 5: Typecheck / lint touched routes**

Run: `npx tsc --noEmit` (or project’s usual check)  
Expected: no errors in new routes

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/candidates src/app/api/admin/employers
git commit -m "feat(admin): add browse and CV download API routes"
```

---

### Task 6: List pages UI

**Files:**
- Create: `src/app/admin/candidates/page.tsx`
- Create: `src/app/admin/employers/page.tsx`
- Modify: `src/components/AdminShell.tsx` — add links “מועמדים” / “מעסיקים” next to existing actions (optional but preferred)

**Interfaces:**
- Consumes: list APIs from Task 5
- Produces: client pages with fetch + timeout pattern like `/admin` (`AbortController` 15s)

- [ ] **Step 1: Candidates list page**

Client component:
- `AdminShell` title `"מועמדים"` subtitle `"דפדפן כרטיסים — קריאה בלבד"`
- Fetch `/api/admin/candidates`
- Table/list rows: name, email, knowledge %, user messages, flexibility, hasCv badge
- Row links to `/admin/candidates/[userId]`
- Loading / error / retry matching admin home patterns

- [ ] **Step 2: Employers list page**

Same pattern → `/api/admin/employers` → `/admin/employers/[userId]`  
Columns: name, email, jobCount, avgUserMessages, avgKnowledgePercent

- [ ] **Step 3: Smoke in browser as admin**

Confirm lists render and navigate.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/candidates/page.tsx src/app/admin/employers/page.tsx src/components/AdminShell.tsx
git commit -m "feat(admin): add candidate and employer list pages"
```

---

### Task 7: Detail pages UI

**Files:**
- Create: `src/app/admin/candidates/[id]/page.tsx`
- Create: `src/app/admin/employers/[id]/page.tsx`
- Create: `src/app/admin/employers/[id]/jobs/[jobId]/page.tsx`
- Optional shared: `src/components/admin/AdminFieldGrid.tsx` (key/value grid for card fields), `src/components/admin/AdminChatLog.tsx` (read-only chat), keep each ≤200 lines

**Interfaces:**
- Consumes: detail APIs; CV URL `/api/admin/candidates/${id}/cv/${documentId}`

- [ ] **Step 1: Shared presentational helpers (if extracting)**

`AdminFieldGrid`: iterate `Object.entries(card)` (skip functions); arrays joined with `, `; show empty as `—`.  
`AdminChatLog`: map messages with role label (משתמש / סוכן) and `createdAt` via `toLocaleString("he-IL")`.

- [ ] **Step 2: Candidate detail page**

Sections in order:
1. Header: name, email, metrics chips (knowledge %, flexibility, user messages)
2. Full card field grid + extras if present
3. Matches table (status, scorePercent, jobId, jobOwnerId, reason)
4. CV documents — button opens `/api/admin/candidates/${id}/cv/${docId}` in new tab
5. Full chat log

Back link to `/admin/candidates`.

- [ ] **Step 3: Employer detail page**

Metrics + job list linking to `/admin/employers/${id}/jobs/${jobId}`.

- [ ] **Step 4: Job detail page**

Full job card, metrics, matches, chat. Back link to employer.

- [ ] **Step 5: Manual smoke**

Open a real candidate with CV + chat; open employer → job; confirm CV downloads for admin.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/candidates src/app/admin/employers src/components/admin
git commit -m "feat(admin): add full candidate, employer, and job detail pages"
```

---

### Task 8: SRS update + final verification

**Files:**
- Modify: `docs/SSOT/SRS.md` — add FR-ADM section
- Modify: `docs/superpowers/specs/2026-07-25-admin-portal-browse-design.md` — set Status to `Implemented` only after code ships (or `Approved — plan ready` until then)

- [ ] **Step 1: Append to SRS**

```md
### FR-ADM (admin portal operations)

| ID | Requirement |
|----|-------------|
| FR-ADM-01 | Admin portal links to Google AI Studio usage/billing for actual Gemini charges and balance |
| FR-ADM-02 | Admin portal shows average candidate/job knowledge percent and average user message counts (candidates and employers) |
| FR-ADM-03 | Admins can browse full candidate, employer, and job records (card, metrics, matches, chat; CV for candidates) via dedicated admin routes |
```

- [ ] **Step 2: Run full unit suite**

Run: `npm test`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add docs/SSOT/SRS.md docs/superpowers/specs/2026-07-25-admin-portal-browse-design.md
git commit -m "docs: add FR-ADM requirements for admin portal browse"
```

---

## Self-review (plan vs spec)

| Spec item | Task |
|-----------|------|
| B: Google billing link + estimate disclaimer | Task 3 |
| C: avg knowledge candidates/jobs | Tasks 1–3 |
| C: avg user messages candidates/employers | Tasks 1–3 |
| C: deferred chat duration | Explicit non-goal |
| Derived fields on entities | Tasks 1, 4, 7 |
| A: dedicated routes | Tasks 6–7 |
| A: candidate card+metrics+matches+chat+CV | Tasks 4–5, 7 |
| A: employer → job pages | Tasks 4–7 |
| Admin APIs + assertAdmin | Task 5 |
| Admin CV without actor viewerId | Task 5 CV route |
| SRS FR-ADM-* | Task 8 |
| No Billing API / no edit / no duration | Global constraints |

No TBD placeholders. Types for view-models defined in Task 4 and reused in Tasks 5–7.
)
