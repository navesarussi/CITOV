import { companyCardFromJobAndName } from "@/domain/company-card";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import {
  TEST_SANDBOX_DATASET_ID,
  isSandboxUserId,
} from "@/domain/test-sandbox";
import { emptyCandidateCard, emptyJobCard, type StoreData, type User } from "@/domain/types";
import { randomUUID } from "crypto";

const COMPANIES = [
  "Wix", "Monday.com", "Check Point", "Amdocs", "Nice", "Fiverr", "CyberArk", "Taboola",
  "Israel Railways", "Shufersal", "Rami Levy", "Teva", "Strauss", "Elbit", "IAI",
  "Bank Leumi", "Bank Hapoalim", "Bezeq", "Partner", "Cellcom", "Fox", "Castro", "Super-Pharm",
  "McDonald's IL", "Cafe Cafe", "Aroma", "Domino's IL", "Gett", "Moovit", "PayPal TLV",
] as const;

const ROLE_TEMPLATES: { titleHe: string; field: string; must: string[]; langs: string[] }[] = [
  { titleHe: "מפתח/ת Full Stack", field: "טכנולוגיה", must: ["React", "Node"], langs: ["עברית", "English"] },
  { titleHe: "DevOps Engineer", field: "טכנולוגיה", must: ["Kubernetes", "AWS"], langs: ["English"] },
  { titleHe: "QA Automation", field: "טכנולוגיה", must: ["Selenium", "Python"], langs: ["עברית"] },
  { titleHe: "מלצר/ית", field: "מסעדנות", must: ["שירות"], langs: ["עברית"] },
  { titleHe: "קופאי/ת", field: "קמעונאות", must: ["קופה"], langs: ["עברית"] },
  { titleHe: "נהג/ת משלוחים", field: "לוגיסטיקה", must: ["רישיון B"], langs: ["עברית"] },
  { titleHe: "נציג/ת מכירות", field: "מכירות", must: ["טלפון"], langs: ["עברית", "English"] },
  { titleHe: "מנהל/ת חשבונות", field: "פיננסים", must: ["Excel"], langs: ["עברית"] },
  { titleHe: "אח/ות מוסמכ/ת", field: "בריאות", must: ["רישיון"], langs: ["עברית"] },
  { titleHe: "מזכיר/ה רפואית", field: "בריאות", must: ["מחשב"], langs: ["עברית", "English"] },
];

const LOCATIONS = ["תל אביב", "חיפה", "ירושלים", "באר שבע", "ראשון לציון", "Remote IL"];

function sandboxUser(id: string, name: string, role: User["role"]): User {
  return {
    id,
    name,
    role,
    email: `${id}@sandbox.test`,
    createdAt: new Date().toISOString(),
    isTest: true,
    datasetId: TEST_SANDBOX_DATASET_ID,
  };
}

export type SandboxGenerateOptions = { jobCount?: number; candidateCount?: number };

export function buildSandboxStore(opts: SandboxGenerateOptions = {}): StoreData {
  const jobTarget = opts.jobCount ?? 150;
  const candTarget = opts.candidateCount ?? 150;
  const now = new Date().toISOString();
  const users: User[] = [];
  const employers = [];
  let jobSeq = 0;

  for (let ci = 0; ci < COMPANIES.length && jobSeq < jobTarget; ci++) {
    const company = COMPANIES[ci]!;
    const employerId = `sandbox-employer-${ci + 1}`;
    users.push(sandboxUser(employerId, company, "employer"));
    const slots = [];
    for (let j = 0; j < 5 && jobSeq < jobTarget; j++) {
      jobSeq += 1;
      const tpl = ROLE_TEMPLATES[jobSeq % ROLE_TEMPLATES.length]!;
      const loc = LOCATIONS[jobSeq % LOCATIONS.length]!;
      const jobId = `sandbox-job-${jobSeq}`;
      const sourceUrl = `https://example-careers.test/${encodeURIComponent(company)}/${jobSeq}`;
      slots.push({
        id: jobId,
        card: {
          ...emptyJobCard(),
          title: tpl.titleHe,
          field: tpl.field,
          location: loc,
          mustHaves: tpl.must,
          requiredLanguages: tpl.langs,
          summary: `${tpl.titleHe} ב-${company} · ${loc}. משרה סינתטית לבדיקות התאמה.`,
          flexibility: 4 + (jobSeq % 6),
        },
        chat: [],
        importMeta: {
          pendingConfirmations: [],
          sourceUrl,
          fetchedAt: now,
          testSandbox: true,
        },
      });
    }
    const first = slots[0]!.card;
    employers.push(
      normalizeEmployerRecord({
        userId: employerId,
        card: first,
        chat: [],
        jobs: slots,
        activeJobId: slots[0]!.id,
        company: companyCardFromJobAndName(company, first),
      }),
    );
  }

  const employees = [];
  for (let i = 1; i <= candTarget; i++) {
    const userId = `sandbox-cand-${String(i).padStart(3, "0")}`;
    users.push(sandboxUser(userId, `Synthetic ${i}`, "employee"));
    const edge = i % 7;
    const card = {
      ...emptyCandidateCard(),
      desiredRole: edge === 0 ? "Senior Architect" : edge === 1 ? "מלצר" : "נציג מכירות",
      field: edge === 2 ? "טכנולוגיה" : edge === 3 ? "מסעדנות" : "מכירות",
      location: LOCATIONS[i % LOCATIONS.length]!,
      skills: edge === 4 ? [] : edge === 5 ? ["React", "Python", "שירות"] : ["שירות", "Excel"],
      languages: edge === 6 ? ["עברית"] : ["עברית", "English"],
      hebrewLevel: "שוטף",
      englishLevel: edge === 6 ? "בסיסי" : "שוטף",
      flexibility: 1 + (i % 10),
      summary: `פרופיל סינתטי #${i} — ללא נתונים אמיתיים.`,
    };
    if (edge === 0) {
      card.desiredRole = "Waiter";
      card.field = "hospitality";
    }
    employees.push({
      userId,
      card,
      chat: [],
      pendingFieldQuestionIds: [],
    });
  }

  return {
    users,
    employees,
    employers,
    fieldQuestions: [],
    fieldAnswers: [],
    matches: [],
    adminSettings: undefined,
    aiUsage: [],
  };
}

export function assertSandboxIsolation(store: StoreData): void {
  for (const u of store.users) {
    if (u.isTest && !isSandboxUserId(u.id)) {
      throw new Error(`test user id must use sandbox- prefix: ${u.id}`);
    }
  }
}

export function sandboxHoldoutPairKeys(): Set<string> {
  const keys = new Set<string>();
  for (let i = 1; i <= 20; i++) {
    keys.add(`sandbox-job-${i}:sandbox-cand-${String(i).padStart(3, "0")}`);
  }
  return keys;
}
