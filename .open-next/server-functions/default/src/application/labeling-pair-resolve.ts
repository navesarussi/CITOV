import { matchingEvalDataset } from "@/application/eval-matching-dataset";
import { companyCardFromJobAndName, emptyCompanyCard, type CompanyCard } from "@/domain/company-card";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import type { CandidateCard, JobCard, StoreData } from "@/domain/types";

export type ResolvedLabelingPair = {
  jobId: string;
  candidateId: string;
  job: JobCard;
  candidate: CandidateCard;
  company: CompanyCard;
  employerName: string;
  employerUserId: string;
  source: "store" | "eval-fixture" | "mixed";
};

const evalJobMap = new Map(matchingEvalDataset.jobs.map((j) => [j.id, j.card]));
const evalCandMap = new Map(matchingEvalDataset.candidates.map((c) => [c.id, c.card]));

function resolveCandidateId(store: StoreData, candidateId: string): string | null {
  if (store.employees.some((e) => e.userId === candidateId)) return candidateId;
  const seed = `seed-${candidateId}`;
  if (store.employees.some((e) => e.userId === seed)) return seed;
  if (evalCandMap.has(candidateId)) return candidateId;
  return null;
}

export function resolveLabelingPair(
  store: StoreData,
  jobId: string,
  candidateId: string,
): ResolvedLabelingPair | null {
  let job: JobCard | undefined;
  let employerUserId = "";
  let employerName = "";
  let company = emptyCompanyCard();

  for (const raw of store.employers) {
    const emp = normalizeEmployerRecord(raw);
    const slot = emp.jobs.find((j) => j.id === jobId);
    if (slot) {
      job = slot.card;
      employerUserId = emp.userId;
      employerName = store.users.find((u) => u.id === emp.userId)?.name ?? "";
      company =
        (raw as { company?: CompanyCard }).company ??
        companyCardFromJobAndName(employerName, slot.card);
      break;
    }
  }
  if (!job) job = evalJobMap.get(jobId);

  const resolvedCandKey = resolveCandidateId(store, candidateId);
  let candidate: CandidateCard | undefined;
  if (resolvedCandKey) {
    const emp = store.employees.find(
      (e) => e.userId === resolvedCandKey || e.userId === `seed-${candidateId}`,
    );
    candidate = emp?.card;
  }
  if (!candidate && evalCandMap.has(candidateId)) {
    candidate = evalCandMap.get(candidateId);
  }

  if (!job || !candidate) return null;

  const source: ResolvedLabelingPair["source"] =
    evalJobMap.has(jobId) && evalCandMap.has(candidateId) && !employerUserId
      ? "eval-fixture"
      : employerUserId
        ? "store"
        : "mixed";

  return {
    jobId,
    candidateId,
    job,
    candidate,
    company,
    employerName,
    employerUserId,
    source,
  };
}
