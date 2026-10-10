import { cardValue } from "@/domain/card-extras";
import type { CandidateCard } from "@/domain/types";

/** שדות שאינם מזהים — מותרים לתור queued לפני אישור/רישיון. */
export const EMPLOYER_ANONYMOUS_CANDIDATE_KEYS = [
  "field",
  "subField",
  "experienceYears",
  "experienceLevel",
  "skills",
  "softSkills",
  "languages",
  "certifications",
  "employmentType",
  "flexibility",
] as const;

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "number") return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/** כרטיס מועמד מעורבב לתור — בלי שם, קשר, CV, narrative/summary/location. */
export function projectCandidateCardAnonymized(
  card: CandidateCard,
): Partial<CandidateCard> {
  const out: Record<string, unknown> = {};
  for (const key of EMPLOYER_ANONYMOUS_CANDIDATE_KEYS) {
    const raw = cardValue(card, key);
    if (isEmpty(raw)) continue;
    out[key] = raw;
  }
  return out as Partial<CandidateCard>;
}

/** סיבת התאמה גנרית — לא מעבירים טקסט חופשי שעלול לכלול PII. */
export function anonymizedMatchReason(): string {
  return "ציון התאמה לפי כרטיס המשרה (פרטים מזהים לאחר אישור והרשאה).";
}

/**
 * חשיפת זהות מועמד לאחר אישור — ברירת מחדל כבויה בפרוד (רישיון השמה).
 * הפעלה: EMPLOYER_APPROVED_IDENTITY_REVEAL=true
 */
export function isEmployerApprovedIdentityRevealEnabled(): boolean {
  if (process.env.NODE_ENV === "development") {
    return process.env.EMPLOYER_APPROVED_IDENTITY_REVEAL !== "false";
  }
  return process.env.EMPLOYER_APPROVED_IDENTITY_REVEAL === "true";
}
