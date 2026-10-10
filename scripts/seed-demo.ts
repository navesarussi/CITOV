/**
 * Idempotent demo seed from eval matching cards → Postgres normalized store.
 * Requires DATABASE_URL (does not run against production by itself — operator must point env).
 */
import { matchingEvalDataset } from "../eval/matching/dataset";
import { normalizeEmployerRecord } from "../src/domain/employer-jobs";
import type { EmployerRecord, StoreData, User } from "../src/domain/types";
import { readNormalizedStore, writeNormalizedStore } from "../src/infrastructure/db/normalized-store";

const SEED_MARKER = "eval-cards-v1";

export function buildDemoStoreFromEval(): StoreData {
  const now = new Date().toISOString();
  const users: User[] = [];
  const employees = matchingEvalDataset.candidates.map((c) => {
    const userId = `seed-${c.id}`;
    users.push({
      id: userId,
      name: c.card.desiredRole || c.id,
      role: "employee",
      email: `${c.id}@demo.local`,
      createdAt: now,
    });
    return {
      userId,
      card: c.card,
      chat: [],
      pendingFieldQuestionIds: [],
    };
  });

  const employers: EmployerRecord[] = [];
  const jobsPerEmployer = 5;
  for (let i = 0; i < matchingEvalDataset.jobs.length; i += jobsPerEmployer) {
    const chunk = matchingEvalDataset.jobs.slice(i, i + jobsPerEmployer);
    const employerId = `seed-employer-${Math.floor(i / jobsPerEmployer) + 1}`;
    users.push({
      id: employerId,
      name: `Demo employer ${Math.floor(i / jobsPerEmployer) + 1}`,
      role: "employer",
      email: `employer${Math.floor(i / jobsPerEmployer) + 1}@demo.local`,
      createdAt: now,
    });
    const slots = chunk.map((j) => ({
      id: j.id,
      name: j.card.title,
      card: j.card,
      chat: [],
    }));
    const active = slots[0]?.id ?? "";
    employers.push(
      normalizeEmployerRecord({
        userId: employerId,
        card: slots[0]?.card ?? { ...chunk[0].card },
        chat: [],
        jobs: slots,
        activeJobId: active,
      }),
    );
  }

  return {
    users,
    employees,
    employers,
    fieldQuestions: [],
    fieldAnswers: [],
    matches: [],
    adminSettings: {
      candidatePrompt: "",
      employerPrompt: "",
      updatedAt: now,
      updatedBy: SEED_MARKER,
    },
    aiUsage: [],
  };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required for seed:demo (refusing memory-only seed).");
    process.exit(1);
  }
  const current = await readNormalizedStore();
  if (current.adminSettings?.updatedBy === SEED_MARKER) {
    console.log("Demo seed already applied (adminSettings.updatedBy marker). Skipping.");
    return;
  }
  const next = buildDemoStoreFromEval();
  await writeNormalizedStore({
    ...next,
    matches: current.matches,
    fieldQuestions: current.fieldQuestions,
    fieldAnswers: current.fieldAnswers,
  });
  console.log(
    `Seeded ${next.employees.length} candidates and ${next.employers.reduce((n, e) => n + e.jobs.length, 0)} jobs (${SEED_MARKER}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
