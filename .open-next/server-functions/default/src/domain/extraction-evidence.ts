/**
 * שער ראיות לחילוץ CV/משרה — ציטוט בטקסט, מספרים בראיה, ושפיות שדות.
 */
import type { WorkHistoryEntry } from "./types";

export type ExtractedField = {
  fieldKey: string;
  value: string;
  evidence: string;
  confidence?: "high" | "medium" | "low";
};

export type EvidenceCheckResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "missing_evidence"
        | "evidence_not_in_source"
        | "numbers_unsupported"
        | "sanity_failed";
      sanityReason?: string;
    };

export type SanityCheckResult = { ok: true } | { ok: false; reason: string };

const SALARY_FIELD_KEYS = new Set([
  "salaryExpectation",
  "salaryMin",
  "salaryMax",
  "salaryRange",
]);

export function normalizeEvidenceText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200f\u200e]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceTokens(text: string): string[] {
  return normalizeEvidenceText(text)
    .split(" ")
    .filter((t) => t.length > 1);
}

/** Evidence quote must appear substantially in the source document. */
export function evidenceAppearsInSource(evidence: string, sourceText: string): boolean {
  const ev = normalizeEvidenceText(evidence);
  if (ev.length < 4) return false;
  const src = normalizeEvidenceText(sourceText);
  if (src.includes(ev)) return true;
  const tokens = evidenceTokens(evidence);
  if (tokens.length === 0) return false;
  const srcTokens = new Set(src.split(" "));
  let hit = 0;
  for (const t of tokens) {
    if (srcTokens.has(t)) hit += 1;
  }
  return hit / tokens.length >= 0.75;
}

export function extractNumericTokens(text: string): string[] {
  const matches = text.match(/\d+(?:[.,]\d+)?/g);
  return matches ?? [];
}

/** מפרק תאריך YYYY או YYYY-MM לשנה+חודש (ברירת מחדל: ינואר). */
export function parseYearMonth(s: string): { y: number; m: number } | null {
  const t = s.trim();
  const ym = t.match(/^(\d{4})[-/](\d{1,2})$/);
  if (ym) return { y: Number(ym[1]), m: Number(ym[2]) };
  const yOnly = t.match(/^(\d{4})$/);
  if (yOnly) return { y: Number(yOnly[1]), m: 1 };
  return null;
}

function toMonthIndex(p: { y: number; m: number }): number {
  return p.y * 12 + (p.m - 1);
}

/** סוף תקופה: שנה בלבד → דצמבר; «היום» → חודש נוכחי. */
function workHistoryEnd(
  row: WorkHistoryEntry,
  now: Date,
): { y: number; m: number } | null {
  if (row.isCurrent) return { y: now.getFullYear(), m: now.getMonth() + 1 };
  const end = parseYearMonth(row.endDate ?? "");
  if (!end) return null;
  if (/^\d{4}$/.test((row.endDate ?? "").trim())) return { y: end.y, m: 12 };
  return end;
}

function isYearOnlyDate(s: string | undefined): boolean {
  return /^\d{4}$/.test((s ?? "").trim());
}

function mergeClosedIntervals(intervals: { start: number; end: number }[]): { start: number; end: number }[] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: { start: number; end: number }[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = out[out.length - 1]!;
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/**
 * סך שנות ניסיון מ-workHistory — מאחד תקופות חופפות לפני סכימה.
 * דוגמה: 2019–2021 + 2020–2023 ⇒ 4 שנים (לא 5).
 */
export function computeExperienceYearsFromWorkHistory(
  workHistory: WorkHistoryEntry[],
  now = new Date(),
): number | null {
  const yearSpans: { start: number; end: number }[] = [];
  const monthSpans: { start: number; end: number }[] = [];

  for (const row of workHistory) {
    const startRaw = row.startDate?.trim() ?? "";
    const start = parseYearMonth(startRaw);
    if (!start) continue;

    if (isYearOnlyDate(startRaw) && (isYearOnlyDate(row.endDate) || row.isCurrent)) {
      const endYear = row.isCurrent ? now.getFullYear() : Number(row.endDate!.trim());
      if (endYear >= start.y) yearSpans.push({ start: start.y, end: endYear });
      continue;
    }

    const end = workHistoryEnd(row, now);
    if (!end) continue;
    const startIdx = toMonthIndex(start);
    const endIdx = toMonthIndex(end);
    if (endIdx < startIdx) continue;
    monthSpans.push({ start: startIdx, end: endIdx });
  }

  let totalYears = 0;
  for (const span of mergeClosedIntervals(yearSpans)) {
    totalYears += span.end - span.start;
  }
  const mergedMonths = mergeClosedIntervals(monthSpans);
  let months = 0;
  for (const span of mergedMonths) {
    months += span.end - span.start + 1;
  }
  totalYears += months / 12;
  if (totalYears <= 0) return null;
  return Math.round(totalYears * 10) / 10;
}

function numbersSupportedForField(params: {
  fieldKey: string;
  value: string;
  evidence: string;
  workHistory?: WorkHistoryEntry[];
}): boolean {
  const nums = extractNumericTokens(params.value);
  if (nums.length === 0) return true;

  const hay = normalizeEvidenceText(params.evidence);

  if (params.fieldKey === "experienceYears" && params.workHistory?.length) {
    const computed = computeExperienceYearsFromWorkHistory(params.workHistory);
    if (computed != null) {
      const target = Number(String(params.value).replace(",", "."));
      if (!Number.isNaN(target) && Math.abs(computed - target) <= 1) return true;
    }
  }

  for (const n of nums) {
    const normalized = n.replace(",", ".");
    if (hay.includes(normalized) || hay.includes(n)) continue;
    return false;
  }
  return true;
}

function yearPlausible(y: number, now: Date): boolean {
  const maxY = now.getFullYear();
  return y >= 1950 && y <= maxY;
}

function notFutureMonth(p: { y: number; m: number }, now: Date): boolean {
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  if (p.y > cy) return false;
  if (p.y === cy && p.m > cm) return false;
  return true;
}

/**
 * בדיקות שפיות לשדה בודד — טווח שנות ניסיון, שכר חיובי, תאריכים לא עתידיים.
 * כישלון → pendingConfirmations (דרך gateExtractedFields).
 */
export function validateFieldSanity(field: ExtractedField, now = new Date()): SanityCheckResult {
  const key = field.fieldKey?.trim() ?? "";
  const value = field.value?.trim() ?? "";
  if (!key || !value) return { ok: true };

  if (key === "experienceYears") {
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n)) return { ok: false, reason: "experienceYears_not_numeric" };
    if (n < 0 || n > 60) return { ok: false, reason: "experienceYears_out_of_range" };
    return { ok: true };
  }

  if (SALARY_FIELD_KEYS.has(key)) {
    const nums = extractNumericTokens(value).map((t) => Number(t.replace(",", ".")));
    if (nums.some((n) => !Number.isFinite(n) || n <= 0)) {
      return { ok: false, reason: "salary_not_positive" };
    }
    return { ok: true };
  }

  if (key === "flexibility") {
    const n = Number(value);
    if (Number.isFinite(n) && (n < 1 || n > 10)) {
      return { ok: false, reason: "flexibility_out_of_range" };
    }
    return { ok: true };
  }

  if (key === "startDate" || key === "endDate") {
    const p = parseYearMonth(value);
    if (!p) return { ok: true };
    if (!yearPlausible(p.y, now)) return { ok: false, reason: "date_year_out_of_range" };
    if (!notFutureMonth(p, now)) return { ok: false, reason: "date_in_future" };
    return { ok: true };
  }

  const range = value.match(/(\d{4})(?:[-/]\d{1,2})?\s*[–-]\s*(\d{4})(?:[-/]\d{1,2})?/);
  if (range && (key.includes("Date") || key.includes("year"))) {
    const start = parseYearMonth(range[1]!);
    const end = parseYearMonth(range[2]!);
    if (start && end) {
      if (toMonthIndex(start) > toMonthIndex(end)) {
        return { ok: false, reason: "date_range_start_after_end" };
      }
      if (!yearPlausible(start.y, now) || !yearPlausible(end.y, now)) {
        return { ok: false, reason: "date_year_out_of_range" };
      }
      if (!notFutureMonth(end, now)) return { ok: false, reason: "date_in_future" };
    }
  }

  return { ok: true };
}

/** שפיות לרשימת ניסיון תעסוקתי — start ≤ end, ללא תאריכי עתיד, שנים 1950..היום. */
export function validateWorkHistorySanity(
  workHistory: WorkHistoryEntry[],
  now = new Date(),
): SanityCheckResult {
  for (const row of workHistory) {
    const start = parseYearMonth(row.startDate ?? "");
    const end = workHistoryEnd(row, now);
    if (!start) continue;
    if (!yearPlausible(start.y, now)) return { ok: false, reason: "work_history_year_out_of_range" };
    if (!notFutureMonth(start, now)) return { ok: false, reason: "work_history_start_in_future" };
    if (end) {
      if (!yearPlausible(end.y, now)) return { ok: false, reason: "work_history_year_out_of_range" };
      if (!notFutureMonth(end, now)) return { ok: false, reason: "work_history_end_in_future" };
      if (toMonthIndex(start) > toMonthIndex(end)) {
        return { ok: false, reason: "work_history_start_after_end" };
      }
    }
  }
  return { ok: true };
}

export function validateExtractedField(
  field: ExtractedField,
  sourceText: string,
  workHistory?: WorkHistoryEntry[],
  now = new Date(),
): EvidenceCheckResult {
  const evidence = field.evidence?.trim() ?? "";
  if (!evidence) return { ok: false, reason: "missing_evidence" };
  if (!evidenceAppearsInSource(evidence, sourceText)) {
    return { ok: false, reason: "evidence_not_in_source" };
  }
  if (
    !numbersSupportedForField({
      fieldKey: field.fieldKey,
      value: field.value,
      evidence,
      workHistory,
    })
  ) {
    return { ok: false, reason: "numbers_unsupported" };
  }
  const sanity = validateFieldSanity(field, now);
  if (!sanity.ok) {
    return { ok: false, reason: "sanity_failed", sanityReason: sanity.reason };
  }
  return { ok: true };
}

export type GatedExtraction = {
  acceptedPatch: Record<string, unknown>;
  pendingConfirmations: ExtractedField[];
  rejected: { field: ExtractedField; reason: string }[];
};

function parsePatchValue(fieldKey: string, value: string): unknown {
  if (fieldKey === "experienceYears") {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : value;
  }
  if (fieldKey === "flexibility") {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  if (["skills", "softSkills", "languages", "mustHaves", "niceToHaves", "requiredLanguages"].includes(fieldKey)) {
    return value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return value;
}

function rejectionReason(check: EvidenceCheckResult): string {
  if (check.ok) return "";
  if (check.reason === "sanity_failed" && check.sanityReason) {
    return `sanity_failed:${check.sanityReason}`;
  }
  return check.reason;
}

/** Split model extractions into auto-accepted vs user confirmation queue. */
export function gateExtractedFields(params: {
  sourceText: string;
  patch: Record<string, unknown>;
  extractedFields?: ExtractedField[];
  fieldConfidence?: Record<string, "high" | "medium" | "low">;
  workHistory?: WorkHistoryEntry[];
  now?: Date;
  /** When set, drop fields whose keys are not in the set (M3). */
  allowedFieldKeys?: ReadonlySet<string>;
}): GatedExtraction {
  const now = params.now ?? new Date();
  const fields: ExtractedField[] =
    params.extractedFields?.length
      ? params.extractedFields
      : Object.entries(params.patch)
          .filter(([, v]) => v != null && String(v).trim() !== "")
          .map(([fieldKey, v]) => ({
            fieldKey,
            value: Array.isArray(v) ? v.join(", ") : String(v),
            evidence: "",
            confidence: params.fieldConfidence?.[fieldKey],
          }));

  const acceptedPatch: Record<string, unknown> = {};
  const pendingConfirmations: ExtractedField[] = [];
  const rejected: GatedExtraction["rejected"] = [];

  const whSanity = params.workHistory?.length
    ? validateWorkHistorySanity(params.workHistory, now)
    : { ok: true as const };

  for (const field of fields) {
    if (!field.fieldKey?.trim() || !field.value?.trim()) continue;
    if (params.allowedFieldKeys && !params.allowedFieldKeys.has(field.fieldKey.trim())) {
      continue;
    }
    const conf = field.confidence ?? params.fieldConfidence?.[field.fieldKey] ?? "high";

    if (!whSanity.ok && field.fieldKey === "experienceYears") {
      pendingConfirmations.push({ ...field, confidence: conf });
      rejected.push({ field, reason: `sanity_failed:${whSanity.reason}` });
      continue;
    }

    const check = validateExtractedField(field, params.sourceText, params.workHistory, now);

    if (!check.ok) {
      pendingConfirmations.push({ ...field, confidence: conf });
      rejected.push({ field, reason: rejectionReason(check) });
      continue;
    }
    if (conf === "medium" || conf === "low") {
      pendingConfirmations.push({ ...field, confidence: conf });
      continue;
    }
    acceptedPatch[field.fieldKey] = parsePatchValue(field.fieldKey, field.value);
  }

  return { acceptedPatch, pendingConfirmations, rejected };
}
