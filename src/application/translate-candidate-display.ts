import { needsTranslationToLocale } from "@/domain/display-locale";
import type { CandidateCard } from "@/domain/types";
import type { Locale } from "@/i18n/types";
import { translateFieldMap } from "@/infrastructure/ai/translate-fields";

const STRING_KEYS = [
  "summary",
  "desiredRole",
  "field",
  "subField",
  "location",
  "preferredCities",
  "remotePreference",
  "relocationWillingness",
  "experienceLevel",
  "hebrewLevel",
  "englishLevel",
  "education",
  "certifications",
  "licenses",
  "computerSkills",
  "salaryExpectation",
  "salaryMin",
  "salaryMax",
  "employmentType",
  "hoursPerWeek",
  "shiftPreference",
  "nightShiftsOk",
  "weekendsOk",
  "transportation",
  "hasVehicle",
  "drivingLicense",
  "personality",
  "workStyle",
  "strengths",
  "weaknesses",
  "careerGoals",
  "motivation",
  "dealBreakers",
  "noticePeriod",
  "startDate",
  "availability",
  "interviewAvailability",
  "customerFacingOk",
  "physicalRequirementsOk",
  "managementExperience",
  "teamSizeManaged",
  "industryExperience",
  "portfolioUrl",
  "linkedinUrl",
  "referencesAvailable",
  "narrative",
] as const satisfies readonly (keyof CandidateCard)[];

const ARRAY_KEYS = ["skills", "softSkills", "languages"] as const satisfies readonly (keyof CandidateCard)[];

function collectTranslatable(card: CandidateCard): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const key of STRING_KEYS) {
    const value = card[key];
    if (typeof value === "string" && value.trim()) fields[key] = value;
  }
  for (const key of ARRAY_KEYS) {
    const value = card[key];
    if (Array.isArray(value) && value.length > 0) {
      fields[key] = value.join("\n");
    }
  }
  for (const [k, v] of Object.entries(card.extras ?? {})) {
    if (v.trim()) fields[`extras.${k}`] = v;
  }
  return fields;
}

function applyTranslated(
  card: CandidateCard,
  translated: Record<string, string>,
): CandidateCard {
  const next: CandidateCard = { ...card, extras: { ...(card.extras ?? {}) } };
  for (const key of STRING_KEYS) {
    if (translated[key] != null) {
      next[key] = translated[key];
    }
  }
  for (const key of ARRAY_KEYS) {
    if (translated[key] != null) {
      next[key] = translated[key]
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  for (const [k, v] of Object.entries(translated)) {
    if (k.startsWith("extras.")) {
      next.extras[k.slice("extras.".length)] = v;
    }
  }
  return next;
}

/** Translate candidate card display fields into the UI locale when needed. */
export async function translateCandidateCardForDisplay(
  card: CandidateCard,
  locale: Locale,
): Promise<CandidateCard> {
  const bag = collectTranslatable(card);
  const sample = Object.values(bag).join(" ");
  if (!needsTranslationToLocale(sample, locale)) return card;

  const translated = await translateFieldMap({ fields: bag, targetLocale: locale });
  return applyTranslated(card, translated);
}
