import type { CandidateCard, JobCard, MatchCanonical } from "./types";

export type { MatchCanonical };

const LOCATION_ALIASES: Record<string, string> = {
  "tel aviv": "tel aviv",
  "תל אביב": "tel aviv",
  "tel-aviv": "tel aviv",
  "ramat gan": "ramat gan",
  "רמת גן": "ramat gan",
  "herzliya": "herzliya",
  "הרצליה": "herzliya",
  "haifa": "haifa",
  "חיפה": "haifa",
  "jerusalem": "jerusalem",
  "ירושלים": "jerusalem",
};

const FIELD_ALIASES: Record<string, string> = {
  hospitality: "hospitality",
  מסעדנות: "hospitality",
  מסעדות: "hospitality",
  restaurants: "hospitality",
  technology: "technology",
  הייטק: "technology",
  software: "technology",
  "פיתוח תוכנה": "technology",
  service: "service",
  שירות: "service",
};

const LANGUAGE_ALIASES: Record<string, string> = {
  english: "english",
  אנגלית: "english",
  hebrew: "hebrew",
  עברית: "hebrew",
  russian: "russian",
  רוסית: "russian",
  arabic: "arabic",
  ערבית: "arabic",
};

const ROLE_ALIASES: Record<string, string> = {
  מלצר: "waiter",
  "מלצר/ית": "waiter",
  waiter: "waiter",
  waitstaff: "waiter",
  bartender: "bartender",
  ברמן: "bartender",
  "ברמן/ית": "bartender",
  chef: "chef",
  טבח: "chef",
  "טבח/ית": "chef",
  "מפתח": "software developer",
  "מפתח/ת": "software developer",
  "מפתח תוכנה": "software developer",
  "software engineer": "software developer",
  "software developer": "software developer",
  "full stack": "full stack developer",
  "full stack developer": "full stack developer",
  "full-stack": "full stack developer",
  "נציג שירות": "customer support",
  "customer support": "customer support",
  "customer service": "customer support",
  "שירות לקוחות": "customer support",
};

function normToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function canonicalizeRoleToken(text: string): string {
  const n = normToken(text);
  if (!n) return text;
  return ROLE_ALIASES[n] ?? ROLE_ALIASES[n.replace(/\/ית$/, "")] ?? text;
}

export function canonicalizeLocationToken(text: string): string {
  const n = normToken(text);
  if (!n) return text;
  return LOCATION_ALIASES[n] ?? text;
}

export function canonicalizeFieldToken(text: string): string {
  const n = normToken(text);
  if (!n) return text;
  return FIELD_ALIASES[n] ?? text;
}

export function canonicalizeLanguageToken(text: string): string {
  const n = normToken(text);
  if (!n) return text;
  return LANGUAGE_ALIASES[n] ?? text;
}

export function inferMatchCanonicalFromText(card: {
  desiredRole?: string;
  title?: string;
  field?: string;
  location?: string;
  skills?: string[];
  languages?: string[];
  mustHaves?: string[];
}): MatchCanonical | undefined {
  const desiredRole = card.desiredRole?.trim();
  const title = card.title?.trim();
  const field = card.field?.trim();
  const location = card.location?.trim();
  if (!desiredRole && !title && !field && !location) return undefined;
  const out: MatchCanonical = {};
  if (desiredRole) out.desiredRole = canonicalizeRoleToken(desiredRole);
  if (title) out.title = canonicalizeRoleToken(title);
  if (field) out.field = canonicalizeFieldToken(field);
  if (location) out.location = canonicalizeLocationToken(location);
  if (card.skills?.length) out.skills = card.skills.map((s) => canonicalizeRoleToken(s));
  if (card.languages?.length) {
    out.languages = card.languages.map((s) => canonicalizeLanguageToken(s));
  }
  if (card.mustHaves?.length) out.mustHaves = card.mustHaves.map((s) => canonicalizeRoleToken(s));
  return out;
}

export function mergeMatchCanonical<T extends { matchCanonical?: MatchCanonical }>(
  card: T,
  incoming?: MatchCanonical,
): T {
  if (!incoming) return card;
  const prev = card.matchCanonical ?? {};
  return {
    ...card,
    matchCanonical: {
      ...prev,
      ...Object.fromEntries(
        Object.entries(incoming).filter(([, v]) =>
          Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim()),
        ),
      ),
    },
  };
}

export function candidateForMatching(card: CandidateCard): CandidateCard {
  const m = card.matchCanonical;
  if (!m) return card;
  return {
    ...card,
    desiredRole: m.desiredRole?.trim() || card.desiredRole,
    field: m.field?.trim() || card.field,
    location: m.location?.trim() || card.location,
    skills: m.skills?.length ? m.skills : card.skills,
    languages: m.languages?.length ? m.languages : card.languages,
  };
}

export function enrichCandidateForRuleMatch(card: CandidateCard): CandidateCard {
  const inferred = inferMatchCanonicalFromText({
    desiredRole: card.desiredRole,
    field: card.field,
    skills: card.skills,
    languages: card.languages,
    location: card.location,
  });
  return candidateForMatching(mergeMatchCanonical(card, inferred));
}

export function enrichJobForRuleMatch(card: JobCard): JobCard {
  const inferred = inferMatchCanonicalFromText({
    title: card.title,
    field: card.field,
    mustHaves: card.mustHaves,
    languages: card.requiredLanguages,
    location: card.location,
  });
  return jobForMatching(mergeMatchCanonical(card, inferred));
}

export function jobForMatching(card: JobCard): JobCard {
  const m = card.matchCanonical;
  if (!m) return card;
  return {
    ...card,
    title: m.title?.trim() || card.title,
    field: m.field?.trim() || card.field,
    location: m.location?.trim() || card.location,
    mustHaves: m.mustHaves?.length ? m.mustHaves : card.mustHaves,
    requiredLanguages: m.languages?.length ? m.languages : card.requiredLanguages,
  };
}

