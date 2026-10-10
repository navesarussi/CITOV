import { matchingEvalDataset } from "../../eval/matching/dataset";
import { companyCardFromJobAndName } from "@/domain/company-card";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import type { EmployerRecord, StoreData, User } from "@/domain/types";
import { readNormalizedStore, writeNormalizedStore } from "@/infrastructure/db/normalized-store";
import { refreshCandidateEmbeddings, refreshJobEmbeddings } from "@/infrastructure/db/card-embeddings";
import { hebrewDemoCandidateCard, hebrewDemoJobCard } from "@/application/demo-hebrew-display";
import { backfillMatchCanonicalOnStore } from "@/application/match-canonical-backfill";
import { rebuildAndWriteMatches } from "@/infrastructure/store";

export const SEED_MARKER = "eval-cards-v1";

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
      card: hebrewDemoCandidateCard(c.card),
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
    const slots = chunk.map((j) => {
      const card = hebrewDemoJobCard(j.card);
      return {
        id: j.id,
        name: card.title,
        card,
        chat: [],
      };
    });
    const active = slots[0]?.id ?? "";
    const employerName = `Demo employer ${Math.floor(i / jobsPerEmployer) + 1}`;
    const firstCard = slots[0]?.card ?? chunk[0].card;
    employers.push(
      normalizeEmployerRecord({
        userId: employerId,
        card: firstCard,
        chat: [],
        jobs: slots,
        activeJobId: active,
        company: companyCardFromJobAndName(employerName, firstCard),
      }),
    );
  }

  return backfillMatchCanonicalOnStore({
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
  });
}

export async function runDemoSeed(options?: { force?: boolean }): Promise<{
  skipped: boolean;
  candidates: number;
  jobs: number;
}> {
  const current = await readNormalizedStore();
  if (current.adminSettings?.updatedBy === SEED_MARKER && !options?.force) {
    return {
      skipped: true,
      candidates: current.employees.length,
      jobs: current.employers.reduce((n, e) => n + (e.jobs?.length ?? 0), 0),
    };
  }
  const next = buildDemoStoreFromEval();
  process.env.ALLOW_FULL_STORE_WRITE = "1";
  await writeNormalizedStore({
    ...next,
    matches: current.matches,
    fieldQuestions: current.fieldQuestions,
    fieldAnswers: current.fieldAnswers,
  });

  for (const emp of next.employees) {
    await refreshCandidateEmbeddings(emp.userId, emp.card);
  }
  for (const raw of next.employers) {
    const er = normalizeEmployerRecord(raw);
    for (const job of er.jobs) {
      await refreshJobEmbeddings(er.userId, job.id, job.card);
    }
  }
  await rebuildAndWriteMatches();

  return {
    skipped: false,
    candidates: next.employees.length,
    jobs: next.employers.reduce((n, e) => n + e.jobs.length, 0),
  };
}
