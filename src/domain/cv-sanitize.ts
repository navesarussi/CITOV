import type { UnmappedFact } from "./types";

const NARRATIVE_CAP = 400;
const SUMMARY_CAP = 200;
const STRING_CAP = 300;
const LIST_ITEM_CAP = 80;

export type SanitizableCvPatch = {
  patch: Record<string, unknown>;
  workHistory?: unknown[];
  educationHistory?: unknown[];
  unmappedFacts?: UnmappedFact[];
  fieldConfidence?: Record<string, "high" | "medium" | "low">;
  inferences?: {
    fieldKey: string;
    value: string;
    evidence: string;
    confidence: "high" | "medium" | "low";
  }[];
};

export type SanitizeResult = SanitizableCvPatch & { strippedCount: number };

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zA-Zא-ת0-9]+/)
    .filter((t) => t.length > 1);
}

/** True when a 4-gram appears 3+ times (LLM degeneration / word salad). */
export function hasRepetitiveLoop(text: string): boolean {
  const toks = tokens(text);
  if (toks.length < 12) return false;
  const counts = new Map<string, number>();
  for (let i = 0; i <= toks.length - 4; i++) {
    const gram = toks.slice(i, i + 4).join(" ");
    const n = (counts.get(gram) ?? 0) + 1;
    counts.set(gram, n);
    if (n >= 3) return true;
  }
  return false;
}

export function isExtractTextUsable(text: string): boolean {
  const t = text.trim();
  if (t.length < 40) return false;
  const unique = new Set(t.replace(/\s+/g, "")).size;
  if (unique < 8) return false;
  if (hasRepetitiveLoop(t)) return false;
  return true;
}

function capString(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trim();
}

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const capped = capString(value, max);
  if (!capped) return undefined;
  if (hasRepetitiveLoop(capped)) return undefined;
  return capped;
}

function cleanStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const item of value) {
    const cleaned = cleanString(item, LIST_ITEM_CAP);
    if (cleaned) out.push(cleaned);
  }
  return out.length ? out : undefined;
}

/** Strip looping / oversized AI output before merge. */
export function sanitizeCvPatch(input: SanitizableCvPatch): SanitizeResult {
  let strippedCount = 0;
  const patch: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(input.patch ?? {})) {
    if (raw === undefined || raw === null) continue;
    if (key === "skills" || key === "softSkills" || key === "languages") {
      const list = cleanStringList(raw);
      if (list) patch[key] = list;
      else if (Array.isArray(raw) && raw.length) strippedCount += 1;
      continue;
    }
    if (key === "extras" && raw && typeof raw === "object") {
      const extras: Record<string, string> = {};
      for (const [ek, ev] of Object.entries(raw as Record<string, unknown>)) {
        const cleaned = cleanString(ev, STRING_CAP);
        if (cleaned) extras[ek] = cleaned;
        else if (typeof ev === "string" && ev.trim()) strippedCount += 1;
      }
      if (Object.keys(extras).length) patch.extras = extras;
      continue;
    }
    if (key === "experienceYears" || key === "flexibility") {
      if (typeof raw === "number") patch[key] = raw;
      continue;
    }
    const max =
      key === "narrative" ? NARRATIVE_CAP : key === "summary" ? SUMMARY_CAP : STRING_CAP;
    if (typeof raw === "string") {
      const cleaned = cleanString(raw, max);
      if (cleaned) patch[key] = cleaned;
      else if (raw.trim()) strippedCount += 1;
      continue;
    }
    patch[key] = raw;
  }

  const unmappedFacts: UnmappedFact[] = [];
  for (const fact of input.unmappedFacts ?? []) {
    const label = cleanString(fact.label, 80);
    const value = cleanString(fact.value, STRING_CAP);
    if (label && value) unmappedFacts.push({ ...fact, label, value });
    else strippedCount += 1;
  }

  const inferences = (input.inferences ?? []).filter((inf) => {
    const fieldKey = cleanString(inf.fieldKey, 80);
    const value = cleanString(inf.value, STRING_CAP);
    const evidence = cleanString(inf.evidence, STRING_CAP);
    if (!fieldKey || !value || !evidence) {
      strippedCount += 1;
      return false;
    }
    return true;
  });

  return {
    patch,
    workHistory: input.workHistory,
    educationHistory: input.educationHistory,
    unmappedFacts,
    fieldConfidence: input.fieldConfidence,
    inferences,
    strippedCount,
  };
}
