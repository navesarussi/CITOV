import { cardValue, formatCardValue } from "@/domain/card-extras";
import { CANDIDATE_FIELD_META } from "@/domain/card-fields";
import type { CandidateCard } from "@/domain/types";

export type CandidateCardView = "full" | "candidate" | "employer";

export type CardViewLine = {
  key: string;
  label: string;
  value: string;
};

/**
 * Full / admin card — every predefined field + extras.
 * Includes sensitive coaching fields (salary, weaknesses, deal-breakers).
 */
export const FULL_CANDIDATE_KEYS: readonly string[] = CANDIDATE_FIELD_META.map((m) => m.key);

/**
 * Candidate self-presentation — safe preview of what they shared.
 * Excludes salary, weaknesses, deal-breakers, and internal flexibility (shown via slider).
 */
export const CANDIDATE_PRESENTATION_KEYS = [
  "summary",
  "desiredRole",
  "field",
  "subField",
  "location",
  "experienceYears",
  "experienceLevel",
  "skills",
  "softSkills",
  "languages",
  "education",
  "personality",
  "workStyle",
  "strengths",
  "careerGoals",
] as const;

/**
 * Employer presentation — hiring-relevant signal for match review.
 * Leads with narrative/summary; includes logistics & skills; hides self-critique
 * (weaknesses) and candidate-private coaching fields that are not fit signals.
 */
export const EMPLOYER_PRESENTATION_KEYS = [
  "summary",
  "narrative",
  "desiredRole",
  "field",
  "subField",
  "location",
  "remotePreference",
  "experienceYears",
  "experienceLevel",
  "skills",
  "softSkills",
  "languages",
  "education",
  "certifications",
  "personality",
  "workStyle",
  "strengths",
  "careerGoals",
  "motivation",
  "employmentType",
  "availability",
  "startDate",
  "noticePeriod",
  "salaryExpectation",
  "flexibility",
] as const;

const CANDIDATE_SET = new Set<string>(CANDIDATE_PRESENTATION_KEYS);
const EMPLOYER_SET = new Set<string>(EMPLOYER_PRESENTATION_KEYS);

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "number") return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

export function keysForCandidateView(view: CandidateCardView): readonly string[] {
  if (view === "full") return FULL_CANDIDATE_KEYS;
  if (view === "candidate") return CANDIDATE_PRESENTATION_KEYS;
  return EMPLOYER_PRESENTATION_KEYS;
}

export function allowsCandidateField(view: CandidateCardView, key: string): boolean {
  if (view === "full") return true;
  if (view === "candidate") return CANDIDATE_SET.has(key);
  return EMPLOYER_SET.has(key);
}

/** Filled lines for a specific audience view. Full view also includes extras. */
export function candidateCardViewLines(
  card: CandidateCard,
  view: CandidateCardView,
  labels: Record<string, string>,
): CardViewLine[] {
  const lines: CardViewLine[] = [];
  for (const key of keysForCandidateView(view)) {
    const raw = cardValue(card, key);
    if (isEmpty(raw)) continue;
    lines.push({
      key,
      label: labels[key] ?? key,
      value: formatCardValue(raw),
    });
  }
  if (view === "full" && card.extras) {
    for (const [key, raw] of Object.entries(card.extras)) {
      if (isEmpty(raw)) continue;
      lines.push({
        key: `extra:${key}`,
        label: labels[key] ?? key,
        value: formatCardValue(raw),
      });
    }
  }
  return lines;
}

/** Privacy-shaped card payload for APIs (never send full card to employers). */
export function projectCandidateCard(
  card: CandidateCard,
  view: Exclude<CandidateCardView, "full">,
): Partial<CandidateCard> {
  const out: Record<string, unknown> = {};
  for (const key of keysForCandidateView(view)) {
    const raw = cardValue(card, key);
    if (isEmpty(raw)) continue;
    out[key] = raw;
  }
  return out as Partial<CandidateCard>;
}
