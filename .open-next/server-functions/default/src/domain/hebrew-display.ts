import {
  canonicalizeFieldToken,
  canonicalizeLanguageToken,
  canonicalizeLocationToken,
  canonicalizeRoleToken,
} from "./match-canonical";
import type { CandidateCard, JobCard } from "./types";

const PHRASES: Record<string, string> = {
  "friendly and patient": "אדיבות וסבלנות",
  "restaurant experience": "ניסיון במסעדה",
  "customer service": "שירות לקוחות",
};

export function hebrewDisplayToken(token: string): string {
  const raw = token.trim();
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  if (PHRASES[lower]) return PHRASES[lower];
  const role = canonicalizeRoleToken(raw);
  if (role === "waiter") return "מלצר/ית";
  if (role === "bartender") return "ברמן/ית";
  if (role === "chef") return "טבח/ית";
  if (role === "software developer") return "מפתח/ת תוכנה";
  if (role === "customer support") return "שירות לקוחות";
  const loc = canonicalizeLocationToken(raw);
  if (loc === "tel aviv") return "תל אביב";
  if (loc === "ramat gan") return "רמת גן";
  if (loc === "herzliya") return "הרצליה";
  if (loc === "haifa") return "חיפה";
  if (loc === "jerusalem") return "ירושלים";
  const field = canonicalizeFieldToken(raw);
  if (field === "hospitality") return "מסעדנות";
  if (field === "technology") return "הייטק";
  if (field === "service") return "שירות";
  const lang = canonicalizeLanguageToken(raw);
  if (lang === "english") return "אנגלית";
  if (lang === "hebrew") return "עברית";
  if (lang === "russian") return "רוסית";
  if (lang === "arabic") return "ערבית";
  return raw
    .replace(/\bNIS\/hour\b/gi, 'ש"ח לשעה')
    .replace(/\bNIS\b/gi, "₪")
    .replace(/\b35-45\b/g, "35–45");
}

export function hebrewDisplayText(value: string): string {
  if (!value.trim()) return value;
  return value
    .split(/,\s*/)
    .map((part) => hebrewDisplayToken(part))
    .join(", ");
}

export function hebrewDisplayJobCard(card: JobCard): JobCard {
  return {
    ...card,
    title: hebrewDisplayToken(card.title ?? ""),
    field: hebrewDisplayToken(card.field ?? ""),
    location: hebrewDisplayToken(card.location ?? ""),
    salaryRange: hebrewDisplayText(card.salaryRange ?? ""),
    mustHaves: card.mustHaves?.map((s) => hebrewDisplayToken(s)),
    niceToHaves: card.niceToHaves?.map((s) => hebrewDisplayToken(s)),
    requiredLanguages: card.requiredLanguages?.map((s) => hebrewDisplayToken(s)),
    personalityFit: hebrewDisplayText(card.personalityFit ?? ""),
    teamCulture: hebrewDisplayText(card.teamCulture ?? ""),
    narrative: hebrewDisplayText(card.narrative ?? ""),
  };
}

export function hebrewDisplayCandidateCard(card: CandidateCard): CandidateCard {
  return {
    ...card,
    desiredRole: hebrewDisplayToken(card.desiredRole ?? ""),
    field: hebrewDisplayToken(card.field ?? ""),
    location: hebrewDisplayToken(card.location ?? ""),
    skills: card.skills?.map((s) => hebrewDisplayToken(s)),
    languages: card.languages?.map((s) => hebrewDisplayToken(s)),
    softSkills: card.softSkills?.map((s) => hebrewDisplayToken(s)),
    personality: hebrewDisplayText(card.personality ?? ""),
    workStyle: hebrewDisplayText(card.workStyle ?? ""),
    narrative: hebrewDisplayText(card.narrative ?? ""),
  };
}
