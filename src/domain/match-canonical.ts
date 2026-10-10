import {
  canonicalizeSkillList,
  skillFamiliesFromSkills,
} from "./skills-taxonomy";
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
  מלונאות: "hospitality",
  technology: "technology",
  הייטק: "technology",
  software: "technology",
  "פיתוח תוכנה": "technology",
  טכנולוגיה: "technology",
  service: "service",
  שירות: "service",
  marketing: "marketing",
  שיווק: "marketing",
  finance: "finance",
  כספים: "finance",
  healthcare: "healthcare",
  בריאות: "healthcare",
  logistics: "logistics",
  לוגיסטיקה: "logistics",
  "human resources": "human resources",
  "משאבי אנוש": "human resources",
  security: "security",
  אבטחה: "security",
  retail: "retail",
  קמעונאות: "retail",
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

const SENIORITY_ALIASES: Record<string, string> = {
  junior: "junior",
  "junior level": "junior",
  "entry level": "junior",
  "ג'וניור": "junior",
  "ג׳וניור": "junior",
  "זוטר": "junior",
  mid: "mid",
  "mid level": "mid",
  "mid-level": "mid",
  intermediate: "mid",
  "ביניים": "mid",
  "רמה בינונית": "mid",
  senior: "senior",
  "senior level": "senior",
  "בכיר": "senior",
  "בכירה": "senior",
  "בכיר/ה": "senior",
  lead: "lead",
  "tech lead": "lead",
  "team lead": "lead",
  "ראש צוות": "lead",
};

const EDUCATION_ALIASES: Record<string, string> = {
  "b.sc": "bachelor",
  bsc: "bachelor",
  bs: "bachelor",
  bachelor: "bachelor",
  "bachelor's": "bachelor",
  ba: "bachelor",
  "תואר ראשון": "bachelor",
  "תואר ראשון בהנדסה": "bachelor",
  msc: "master",
  ms: "master",
  master: "master",
  "master's": "master",
  mba: "master",
  "תואר שני": "master",
  phd: "phd",
  doctorate: "phd",
  "דוקטורט": "phd",
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
  "backend developer": "backend developer",
  "backend engineer": "backend developer",
  "מהנדס backend": "backend developer",
  "מפתח backend": "backend developer",
  "customer service representative": "customer support",
  "customer service": "customer support",
  "נציג שירות לקוחות": "customer support",
  "נציג שירות": "customer support",
  "qa engineer": "qa engineer",
  "junior qa": "qa engineer",
  "בודק/ת תוכנה": "qa engineer",
  "software engineer": "software developer",
  "full stack developer": "full stack developer",
  "מפתח full stack": "full stack developer",
  "tech lead": "tech lead",
  "sales associate": "sales associate",
  "sales": "sales associate",
  "מוכר/ת": "sales associate",
  "מכירות": "sales associate",
  "marketing manager": "marketing manager",
  "marketing lead": "marketing manager",
  "מנהל/ת שיווק": "marketing manager",
  "data analyst": "data analyst",
  "bookkeeper": "bookkeeper",
  "accountant assistant": "bookkeeper",
  "מנהל/ת חשבונות": "bookkeeper",
  "עוזר/ת חשבונאי": "bookkeeper",
  "caregiver": "caregiver",
  "מטפל/ת": "caregiver",
  "delivery driver": "courier",
  "courier": "courier",
  "שליח/ה": "courier",
  "שליח": "courier",
  "hr coordinator": "hr generalist",
  "hr generalist": "hr generalist",
  "רכז/ת hr": "hr generalist",
  "security guard": "security officer",
  "security officer": "security officer",
  "מאבטח/ת": "security officer",
  "hotel receptionist": "front desk",
  "front desk agent": "front desk",
  "פקיד/ת קבלה": "front desk",
  "mobile developer": "ios developer",
  "ios developer": "ios developer",
  "מפתח/ת ios": "ios developer",
  "מפתח ios": "ios developer",
  "devops engineer": "devops",
  devops: "devops",
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

export function canonicalizeSeniorityToken(text: string): string {
  const n = normToken(text);
  if (!n) return text;
  return SENIORITY_ALIASES[n] ?? text;
}

export function canonicalizeEducationToken(text: string): string {
  const n = normToken(text);
  if (!n) return text;
  return EDUCATION_ALIASES[n] ?? text;
}

export function inferMatchCanonicalFromText(card: {
  desiredRole?: string;
  title?: string;
  field?: string;
  location?: string;
  skills?: string[];
  languages?: string[];
  mustHaves?: string[];
  seniority?: string;
  seniorityLevel?: string;
  experienceLevel?: string;
  education?: string;
  industryDomain?: string;
}): MatchCanonical | undefined {
  const desiredRole = card.desiredRole?.trim();
  const title = card.title?.trim();
  const field = card.field?.trim();
  const location = card.location?.trim();
  const seniorityRaw =
    card.seniority?.trim() ||
    card.seniorityLevel?.trim() ||
    card.experienceLevel?.trim();
  if (!desiredRole && !title && !field && !location && !seniorityRaw) return undefined;
  const out: MatchCanonical = {};
  if (desiredRole) out.desiredRole = canonicalizeRoleToken(desiredRole);
  if (title) out.title = canonicalizeRoleToken(title);
  if (field) out.field = canonicalizeFieldToken(field);
  if (location) out.location = canonicalizeLocationToken(location);
  if (seniorityRaw) out.seniority = canonicalizeSeniorityToken(seniorityRaw);
  if (card.industryDomain?.trim()) {
    out.industryDomain = canonicalizeFieldToken(card.industryDomain);
  }
  if (card.skills?.length) {
    out.skills = canonicalizeSkillList(card.skills);
    const families = skillFamiliesFromSkills(card.skills);
    if (families.length) out.skillFamilies = families;
  }
  if (card.languages?.length) {
    out.languages = card.languages.map((s) => canonicalizeLanguageToken(s));
  }
  if (card.mustHaves?.length) out.mustHaves = canonicalizeSkillList(card.mustHaves);
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
    seniority: m.seniority?.trim() || card.seniority,
    experienceLevel: m.seniority?.trim() || card.experienceLevel,
    industryDomain: m.industryDomain?.trim() || card.industryDomain,
  };
}

export function enrichCandidateForRuleMatch(card: CandidateCard): CandidateCard {
  const skills = [...card.skills, ...(card.techStack ?? [])];
  const inferred = inferMatchCanonicalFromText({
    desiredRole: card.desiredRole,
    field: card.field,
    skills,
    languages: card.languages,
    location: card.location,
    seniority: card.seniority,
    experienceLevel: card.experienceLevel,
    education: card.education,
    industryDomain: card.industryDomain,
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
    seniorityLevel: card.seniorityLevel,
    industryDomain: card.industryDomain,
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
    seniorityLevel: m.seniority?.trim() || card.seniorityLevel,
    industryDomain: m.industryDomain?.trim() || card.industryDomain,
  };
}

