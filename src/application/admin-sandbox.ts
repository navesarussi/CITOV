import { companyCardFromJobAndName } from "@/domain/company-card";
import {
  ADMIN_SANDBOX_EMPLOYEE_ID,
  ADMIN_SANDBOX_EMPLOYER_ID,
} from "@/domain/admin-sandbox";
import { createJobSlot, normalizeEmployerRecord } from "@/domain/employer-jobs";
import {
  emptyCandidateCard,
  emptyJobCard,
  type StoreData,
  type User,
} from "@/domain/types";

const SANDBOX_MARKER = "admin-sandbox";

function sandboxUser(id: string, role: User["role"], name: string): User {
  return {
    id,
    name,
    role,
    email: `${id}@sandbox.citov.local`,
    createdAt: new Date().toISOString(),
  };
}

export function ensureAdminSandboxProfiles(store: StoreData): StoreData {
  const now = new Date().toISOString();
  let users = [...store.users];
  let employees = [...store.employees];
  let employers = [...store.employers];

  const ensureUser = (u: User) => {
    if (!users.some((x) => x.id === u.id)) users = [...users, u];
  };

  ensureUser(
    sandboxUser(ADMIN_SANDBOX_EMPLOYEE_ID, "employee", "מועמד בדיקה (מנהל)"),
  );
  if (!employees.some((e) => e.userId === ADMIN_SANDBOX_EMPLOYEE_ID)) {
    employees = [
      ...employees,
      {
        userId: ADMIN_SANDBOX_EMPLOYEE_ID,
        card: emptyCandidateCard(),
        chat: [],
        pendingFieldQuestionIds: [],
      },
    ];
  }

  ensureUser(
    sandboxUser(ADMIN_SANDBOX_EMPLOYER_ID, "employer", "מעסיק בדיקה (מנהל)"),
  );
  if (!employers.some((e) => e.userId === ADMIN_SANDBOX_EMPLOYER_ID)) {
    const job = createJobSlot({ name: "משרת בדיקה" });
    const card = emptyJobCard();
    card.title = "משרת בדיקה";
    job.card = card;
    employers = [
      ...employers,
      normalizeEmployerRecord({
        userId: ADMIN_SANDBOX_EMPLOYER_ID,
        card,
        chat: [],
        jobs: [job],
        activeJobId: job.id,
        company: companyCardFromJobAndName("חברת בדיקה (מנהל)", card),
      }),
    ];
  }

  return {
    ...store,
    users,
    employees,
    employers,
    adminSettings: {
      ...(store.adminSettings ?? { candidatePrompt: "", employerPrompt: "" }),
      updatedAt: store.adminSettings?.updatedAt ?? now,
      updatedBy: store.adminSettings?.updatedBy ?? SANDBOX_MARKER,
    },
  };
}

export function resetAdminSandboxEmployee(store: StoreData): StoreData {
  const base = ensureAdminSandboxProfiles(store);
  return {
    ...base,
    employees: base.employees.map((e) =>
      e.userId === ADMIN_SANDBOX_EMPLOYEE_ID
        ? {
            ...e,
            card: emptyCandidateCard(),
            chat: [],
            pendingFieldQuestionIds: [],
            cv: undefined,
          }
        : e,
    ),
  };
}

export function resetAdminSandboxEmployer(store: StoreData): StoreData {
  const base = ensureAdminSandboxProfiles(store);
  const job = createJobSlot({ name: "משרת בדיקה" });
  const card = emptyJobCard();
  card.title = "משרת בדיקה";
  job.card = card;
  const employer = normalizeEmployerRecord({
    userId: ADMIN_SANDBOX_EMPLOYER_ID,
    card,
    chat: [],
    jobs: [job],
    activeJobId: job.id,
    company: companyCardFromJobAndName("חברת בדיקה (מנהל)", card),
  });
  return {
    ...base,
    employers: base.employers.map((e) =>
      e.userId === ADMIN_SANDBOX_EMPLOYER_ID ? employer : e,
    ),
  };
}
