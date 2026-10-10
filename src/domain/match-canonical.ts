import type { CandidateCard, JobCard, MatchCanonical } from "./types";

export type { MatchCanonical };

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
};

function normToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function canonicalizeRoleToken(text: string): string {
  const n = normToken(text);
  if (!n) return text;
  return ROLE_ALIASES[n] ?? ROLE_ALIASES[n.replace(/\/ית$/, "")] ?? text;
}

export function inferMatchCanonicalFromText(card: {
  desiredRole?: string;
  title?: string;
  field?: string;
  skills?: string[];
  languages?: string[];
  mustHaves?: string[];
}): MatchCanonical | undefined {
  const desiredRole = card.desiredRole?.trim();
  const title = card.title?.trim();
  const field = card.field?.trim();
  if (!desiredRole && !title && !field) return undefined;
  const out: MatchCanonical = {};
  if (desiredRole) out.desiredRole = canonicalizeRoleToken(desiredRole);
  if (title) out.title = canonicalizeRoleToken(title);
  if (field) out.field = field;
  if (card.skills?.length) out.skills = card.skills.map((s) => canonicalizeRoleToken(s));
  if (card.languages?.length) out.languages = card.languages;
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
    skills: m.skills?.length ? m.skills : card.skills,
    languages: m.languages?.length ? m.languages : card.languages,
  };
}

export function jobForMatching(card: JobCard): JobCard {
  const m = card.matchCanonical;
  if (!m) return card;
  return {
    ...card,
    title: m.title?.trim() || card.title,
    field: m.field?.trim() || card.field,
    mustHaves: m.mustHaves?.length ? m.mustHaves : card.mustHaves,
    requiredLanguages: m.languages?.length ? m.languages : card.requiredLanguages,
  };
}
