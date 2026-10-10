import { canonicalizeRoleToken } from "./match-canonical";
import {
  detectWorkDomain,
  normalizeSeniority,
  SALARY_BANDS_NIS,
  type SeniorityBand,
} from "./work-domain";
import type { AdminSettings, CandidateCard, JobCard } from "./types";

function extractNumbers(text: string): number[] {
  const cleaned = text.replace(/[,₪]/g, "").replace(/k\b/gi, "000");
  const matches = cleaned.match(/\d[\d.]*/g) ?? [];
  return matches
    .map((m) => Number(m.replace(/[^\d.]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => (n < 500 ? n * 1000 : n));
}

function candidateSalaryRange(candidate: CandidateCard): { min?: number; max?: number } {
  const mins = [
    ...extractNumbers(candidate.salaryMin ?? ""),
    ...extractNumbers(candidate.salaryExpectation ?? ""),
  ];
  const maxs = [
    ...extractNumbers(candidate.salaryMax ?? ""),
    ...extractNumbers(candidate.salaryExpectation ?? ""),
  ];
  return {
    min: mins.length ? Math.min(...mins) : undefined,
    max: maxs.length ? Math.max(...maxs) : undefined,
  };
}

function jobSalaryRange(job: JobCard): { min?: number; max?: number } {
  const fromRange = extractNumbers(job.salaryRange ?? "");
  const mins = [...extractNumbers(job.salaryMin ?? ""), ...(fromRange.length ? [Math.min(...fromRange)] : [])];
  const maxs = [...extractNumbers(job.salaryMax ?? ""), ...(fromRange.length ? [Math.max(...fromRange)] : [])];
  let min = mins.length ? Math.min(...mins) : undefined;
  let max = maxs.length ? Math.max(...maxs) : undefined;

  if (min == null && max == null && detectWorkDomain(job) === "technology") {
    const roleKey = canonicalizeRoleToken(job.title);
    const seniority =
      normalizeSeniority(job.seniorityLevel) ??
      normalizeSeniority(job.minExperienceYears ? `mid` : undefined);
    const band = lookupSalaryBand(roleKey, seniority);
    if (band) {
      min = band.min;
      max = band.max;
    }
  }
  return { min, max };
}

function lookupSalaryBand(
  roleKey: string,
  seniority?: SeniorityBand,
): { min: number; max: number } | undefined {
  const table = SALARY_BANDS_NIS[roleKey];
  if (!table) return undefined;
  const s = seniority ?? "mid";
  return table[s];
}

export function salaryHardFilterEnabled(
  job: JobCard,
  adminSettings?: AdminSettings | null,
): boolean {
  if (job.salaryBandHardFilter === true) return true;
  if (String(job.extras?.salaryHardFilter ?? "").toLowerCase() === "true") return true;
  if (adminSettings?.salaryBandHardFilterDefault === true) return true;
  return false;
}

export type HardFilterResult = { pass: true } | { pass: false; reason: string };

export function evaluateMatchHardFilters(
  candidate: CandidateCard,
  job: JobCard,
  adminSettings?: AdminSettings | null,
): HardFilterResult {
  if (!salaryHardFilterEnabled(job, adminSettings)) return { pass: true };

  const c = candidateSalaryRange(candidate);
  const j = jobSalaryRange(job);
  if (c.min != null && j.max != null && c.min > j.max) {
    return {
      pass: false,
      reason: "salary_hard_filter: candidate minimum above job maximum",
    };
  }
  if (c.max != null && j.min != null && c.max < j.min) {
    return {
      pass: false,
      reason: "salary_hard_filter: candidate maximum below job minimum",
    };
  }

  const clearanceRequired = String(job.extras?.securityClearanceRequired ?? job.securityClearanceRequired ?? "")
    .trim()
    .toLowerCase();
  if (clearanceRequired && clearanceRequired !== "none" && clearanceRequired !== "לא") {
    const candClear = String(
      candidate.securityClearance ?? candidate.extras?.securityClearance ?? "",
    )
      .trim()
      .toLowerCase();
    if (!candClear || candClear === "none" || candClear === "לא" || candClear === "אין") {
      return { pass: false, reason: "clearance_hard_filter: required clearance missing" };
    }
  }

  return { pass: true };
}

