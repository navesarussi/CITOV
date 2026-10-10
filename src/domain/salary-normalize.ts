import type { CandidateCard, JobCard } from "./types";

export type MonthlySalaryRange = { min?: number; max?: number };

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Parse free-text salary into approximate ILS/month (gross). */
export function parseSalaryTextToMonthlyIls(text: string): MonthlySalaryRange {
  const raw = text.trim();
  if (!raw) return {};

  const t = norm(raw);
  const isYearly = /(?:לשנה|שנתי|year|annual|pa\b|per\s*year|\/yr)/i.test(raw);
  const isHourly = /(?:לשעה|ש"?ש|hour|hourly|\/h\b|per\s*hour)/i.test(raw);

  let nums = extractNumericTokens(raw);
  if (!nums.length) return {};

  if (isHourly) {
    nums = nums.map((n) => Math.round(n * 160));
  } else if (isYearly) {
    nums = nums.map((n) => Math.round(n / 12));
  }

  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
  };
}

function extractNumericTokens(text: string): number[] {
  let s = text.replace(/[,₪]/g, " ");
  s = s.replace(/(\d)\s*k\b/gi, "$1000");
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*(?:k|K)\b/g, (_, n) => String(Number(n) * 1000));
  s = s.replace(/(\d+)\s*(?:אלף|אלפ)/g, (_, n) => String(Number(n) * 1000));

  const matches = s.match(/\d[\d.]*/g) ?? [];
  const out: number[] = [];
  for (const m of matches) {
    let n = Number(m.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) continue;
    if (n < 500 && !/ש"?ש|hour|לשעה/i.test(text)) n *= 1000;
    out.push(Math.round(n));
  }
  return out;
}

export function candidateMonthlySalaryRange(card: CandidateCard): MonthlySalaryRange {
  const parts = [card.salaryMin, card.salaryMax, card.salaryExpectation].filter(Boolean);
  const ranges = parts.map((p) => parseSalaryTextToMonthlyIls(p));
  const mins = ranges.map((r) => r.min).filter((n): n is number => n != null);
  const maxs = ranges.map((r) => r.max).filter((n): n is number => n != null);
  if (!mins.length && !maxs.length) return {};
  return {
    min: mins.length ? Math.min(...mins) : undefined,
    max: maxs.length ? Math.max(...maxs, ...mins) : undefined,
  };
}

export function jobMonthlySalaryRange(card: JobCard): MonthlySalaryRange {
  const parts = [card.salaryMin, card.salaryMax, card.salaryRange].filter(Boolean);
  const ranges = parts.map((p) => parseSalaryTextToMonthlyIls(p));
  const mins = ranges.map((r) => r.min).filter((n): n is number => n != null);
  const maxs = ranges.map((r) => r.max).filter((n): n is number => n != null);
  if (!mins.length && !maxs.length) return {};
  const min = mins.length ? Math.min(...mins) : undefined;
  const max = maxs.length ? Math.max(...maxs) : undefined;
  return { min, max: max ?? min };
}

/** 0..1 overlap of monthly salary intervals (0 if either side unknown). */
export function salaryMonthlyOverlapScore(
  candidate: MonthlySalaryRange,
  job: MonthlySalaryRange,
): number {
  const cMin = candidate.min ?? candidate.max;
  const cMax = candidate.max ?? candidate.min;
  const jMin = job.min ?? job.max;
  const jMax = job.max ?? job.min;
  if (cMin == null || cMax == null || jMin == null || jMax == null) return 0;

  const overlapStart = Math.max(cMin, jMin);
  const overlapEnd = Math.min(cMax, jMax);
  if (overlapEnd < overlapStart) return 0;

  const overlapLen = overlapEnd - overlapStart;
  const unionLen = Math.max(cMax, jMax) - Math.min(cMin, jMin);
  if (unionLen <= 0) return 1;
  return Math.max(0, Math.min(1, overlapLen / unionLen));
}
