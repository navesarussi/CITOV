import {
  canonicalizeFieldToken,
  canonicalizeLanguageToken,
  canonicalizeLocationToken,
  canonicalizeRoleToken,
  inferMatchCanonicalFromText,
  mergeMatchCanonical,
} from "@/domain/match-canonical";
import type { CandidateCard, JobCard } from "@/domain/types";

function translateToken(token: string): string {
  const role = canonicalizeRoleToken(token);
  if (role === "waiter") return "מלצר/ית";
  if (role === "bartender") return "ברמן/ית";
  if (role === "chef") return "טבח/ית";
  if (role === "software developer") return "מפתח/ת תוכנה";
  if (role === "customer support") return "שירות לקוחות";
  const loc = canonicalizeLocationToken(token);
  if (loc === "tel aviv") return "תל אביב";
  if (loc === "ramat gan") return "רמת גן";
  if (loc === "herzliya") return "הרצליה";
  if (loc === "haifa") return "חיפה";
  const field = canonicalizeFieldToken(token);
  if (field === "hospitality") return "מסעדנות";
  if (field === "technology") return "הייטק";
  if (field === "service") return "שירות";
  const lang = canonicalizeLanguageToken(token);
  if (lang === "english") return "אנגלית";
  if (lang === "hebrew") return "עברית";
  if (lang === "russian") return "רוסית";
  return token;
}

function translateList(values: string[] | undefined): string[] {
  if (!values?.length) return values ?? [];
  return values.map((v) => translateToken(v));
}

/** Demo/prod seed cards: Hebrew display, English canonical tokens for rules. Eval JSON stays unchanged. */
export function hebrewDemoJobCard(card: JobCard): JobCard {
  const inferred = inferMatchCanonicalFromText(card);
  const next: JobCard = {
    ...card,
    title: translateToken(card.title ?? ""),
    field: translateToken(card.field ?? ""),
    location: translateToken(card.location ?? ""),
    mustHaves: translateList(card.mustHaves),
    niceToHaves: translateList(card.niceToHaves),
    requiredLanguages: translateList(card.requiredLanguages),
  };
  return mergeMatchCanonical(next, inferred);
}

export function hebrewDemoCandidateCard(card: CandidateCard): CandidateCard {
  const inferred = inferMatchCanonicalFromText({
    desiredRole: card.desiredRole,
    field: card.field,
    skills: card.skills,
    languages: card.languages,
  });
  const next: CandidateCard = {
    ...card,
    desiredRole: translateToken(card.desiredRole ?? ""),
    field: translateToken(card.field ?? ""),
    location: translateToken(card.location ?? ""),
    skills: translateList(card.skills),
    languages: translateList(card.languages),
  };
  return mergeMatchCanonical(next, inferred);
}
