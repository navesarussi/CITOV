import type { WorkHistoryEntry } from "./types";

export type ExtractedField = {
  fieldKey: string;
  value: string;
  evidence: string;
  confidence?: "high" | "medium" | "low";
};

export type EvidenceCheckResult =
  | { ok: true }
  | { ok: false; reason: "missing_evidence" | "evidence_not_in_source" | "numbers_unsupported" };

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

function parseYearMonth(s: string): { y: number; m: number } | null {
  const t = s.trim();
  const ym = t.match(/^(\d{4})[-/](\d{1,2})$/);
  if (ym) return { y: Number(ym[1]), m: Number(ym[2]) };
  const yOnly = t.match(/^(\d{4})$/);
  if (yOnly) return { y: Number(yOnly[1]), m: 1 };
  return null;
}

/** Total years of experience from structured work history (deterministic). */
export function computeExperienceYearsFromWorkHistory(
  workHistory: WorkHistoryEntry[],
  now = new Date(),
): number | null {
  let months = 0;
  for (const row of workHistory) {
    const start = parseYearMonth(row.startDate ?? "");
    const end = row.isCurrent ? { y: now.getFullYear(), m: now.getMonth() + 1 } : parseYearMonth(row.endDate ?? "");
    if (!start || !end) continue;
    const span = (end.y - start.y) * 12 + (end.m - start.m);
    if (span > 0) months += span;
  }
  if (months <= 0) return null;
  return Math.round((months / 12) * 10) / 10;
}

function numbersSupportedForField(params: {
  fieldKey: string;
  value: string;
  evidence: string;
  sourceText: string;
  workHistory?: WorkHistoryEntry[];
}): boolean {
  const nums = extractNumericTokens(params.value);
  if (nums.length === 0) return true;

  const hay = `${normalizeEvidenceText(params.evidence)} ${normalizeEvidenceText(params.sourceText)}`;

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

export function validateExtractedField(
  field: ExtractedField,
  sourceText: string,
  workHistory?: WorkHistoryEntry[],
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
      sourceText,
      workHistory,
    })
  ) {
    return { ok: false, reason: "numbers_unsupported" };
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

/** Split model extractions into auto-accepted vs user confirmation queue. */
export function gateExtractedFields(params: {
  sourceText: string;
  patch: Record<string, unknown>;
  extractedFields?: ExtractedField[];
  fieldConfidence?: Record<string, "high" | "medium" | "low">;
  workHistory?: WorkHistoryEntry[];
}): GatedExtraction {
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

  for (const field of fields) {
    if (!field.fieldKey?.trim() || !field.value?.trim()) continue;
    const conf = field.confidence ?? params.fieldConfidence?.[field.fieldKey] ?? "high";
    const check = validateExtractedField(field, params.sourceText, params.workHistory);

    if (!check.ok) {
      pendingConfirmations.push({ ...field, confidence: conf });
      rejected.push({ field, reason: check.reason });
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
