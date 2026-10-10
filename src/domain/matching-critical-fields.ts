import { inferMatchCanonicalFromText } from "./match-canonical";
import type { CandidateCard, JobCard, MatchCanonical, StoreData } from "./types";

export type MatchingFieldAuditRow = {
  field: string;
  usedInRule: boolean;
  usedInSemanticRole: boolean;
  usedInSemanticSkills: boolean;
  usedInSemanticProfile: boolean;
  canonicalEnglish: boolean;
  notes: string;
};

/** Fields participating in matching and how cross-language normalization applies. */
export const MATCHING_FIELD_AUDIT: MatchingFieldAuditRow[] = [
  { field: "desiredRole / title", usedInRule: true, usedInSemanticRole: true, usedInSemanticSkills: false, usedInSemanticProfile: false, canonicalEnglish: true, notes: "match-canonical ROLE_ALIASES → matchCanonical.desiredRole/title" },
  { field: "field / subField", usedInRule: true, usedInSemanticRole: true, usedInSemanticSkills: false, usedInSemanticProfile: false, canonicalEnglish: true, notes: "FIELD_ALIASES" },
  { field: "location", usedInRule: true, usedInSemanticRole: false, usedInSemanticSkills: false, usedInSemanticProfile: false, canonicalEnglish: true, notes: "LOCATION_ALIASES (e.g. תל אביב → tel aviv)" },
  { field: "skills / techStack / mustHaves / niceToHaves", usedInRule: true, usedInSemanticRole: false, usedInSemanticSkills: true, usedInSemanticProfile: false, canonicalEnglish: true, notes: "skills-taxonomy SKILL_ALIASES + families" },
  { field: "languages / requiredLanguages", usedInRule: true, usedInSemanticRole: false, usedInSemanticSkills: false, usedInSemanticProfile: false, canonicalEnglish: true, notes: "LANGUAGE_ALIASES" },
  { field: "seniority / seniorityLevel / experienceLevel", usedInRule: false, usedInSemanticRole: true, usedInSemanticSkills: false, usedInSemanticProfile: false, canonicalEnglish: true, notes: "SENIORITY_ALIASES → matchCanonical.seniority" },
  { field: "softSkills", usedInRule: true, usedInSemanticRole: false, usedInSemanticSkills: true, usedInSemanticProfile: false, canonicalEnglish: false, notes: "Token overlap as-is; partial HE aliases via skills where listed" },
  { field: "personality / workStyle ↔ personalityFit / teamCulture", usedInRule: false, usedInSemanticRole: false, usedInSemanticSkills: false, usedInSemanticProfile: true, canonicalEnglish: false, notes: "Profile segment embeddings only (no rule textScore — avoids HE/EN skew)" },
  { field: "summary / narrative / companyDescription", usedInRule: false, usedInSemanticRole: false, usedInSemanticSkills: false, usedInSemanticProfile: true, canonicalEnglish: false, notes: "Embeddings only (profile segment); not canonicalized" },
  { field: "salary* / salaryRange", usedInRule: true, usedInSemanticRole: false, usedInSemanticSkills: false, usedInSemanticProfile: false, canonicalEnglish: false, notes: "salary-normalize → ILS/month overlap (K, ranges, yearly, hourly)" },
  {
    field: "education / educationHistory",
    usedInRule: false,
    usedInSemanticRole: false,
    usedInSemanticSkills: false,
    usedInSemanticProfile: true,
    canonicalEnglish: false,
    notes: "Embeddings via profile/work history; canonicalizeEducationToken for reports",
  },
  { field: "industryDomain", usedInRule: false, usedInSemanticRole: false, usedInSemanticSkills: false, usedInSemanticProfile: false, canonicalEnglish: true, notes: "FIELD_ALIASES on matchCanonical.industryDomain; domain weights in work-domain" },
];

export type CanonCoverageStats = {
  candidateCards: number;
  jobCards: number;
  candidateWithCanonical: number;
  jobWithCanonical: number;
  candidateCriticalComplete: number;
  jobCriticalComplete: number;
};

const CRITICAL_CANDIDATE_KEYS = [
  "desiredRole",
  "field",
  "location",
  "skills",
  "languages",
] as const;

const CRITICAL_JOB_KEYS = ["title", "field", "location", "mustHaves", "requiredLanguages"] as const;

function hasCanonValue(m: MatchCanonical | undefined, key: keyof MatchCanonical): boolean {
  const v = m?.[key];
  if (Array.isArray(v)) return v.length > 0;
  return Boolean(String(v ?? "").trim());
}

function inferredCanon(card: Record<string, unknown>, kind: "candidate" | "job"): MatchCanonical | undefined {
  if (kind === "candidate") {
    return inferMatchCanonicalFromText({
      desiredRole: String(card.desiredRole ?? ""),
      field: String(card.field ?? ""),
      location: String(card.location ?? ""),
      skills: (card.skills as string[]) ?? [],
      languages: (card.languages as string[]) ?? [],
      seniority: String(card.seniority ?? ""),
      experienceLevel: String(card.experienceLevel ?? ""),
      industryDomain: String(card.industryDomain ?? ""),
    });
  }
  return inferMatchCanonicalFromText({
    title: String(card.title ?? ""),
    field: String(card.field ?? ""),
    location: String(card.location ?? ""),
    mustHaves: (card.mustHaves as string[]) ?? [],
    languages: (card.requiredLanguages as string[]) ?? [],
    seniorityLevel: String(card.seniorityLevel ?? ""),
    industryDomain: String(card.industryDomain ?? ""),
  });
}

function criticalComplete(
  card: CandidateCard | JobCard,
  kind: "candidate" | "job",
): boolean {
  const merged = { ...inferredCanon(card as Record<string, unknown>, kind), ...card.matchCanonical };
  const keys =
    kind === "candidate"
      ? (["desiredRole", "field", "location", "skills", "languages"] as const)
      : (["title", "field", "location", "mustHaves", "languages"] as const);
  for (const key of keys) {
    const display = (card as Record<string, unknown>)[key === "languages" && kind === "job" ? "requiredLanguages" : key];
    if (Array.isArray(display) ? display.length === 0 : !String(display ?? "").trim()) continue;
    if (!hasCanonValue(merged, key === "mustHaves" ? "mustHaves" : key)) return false;
  }
  return true;
}

export function measureMatchCanonicalCoverage(store: StoreData): CanonCoverageStats {
  let candidateWithCanonical = 0;
  let jobWithCanonical = 0;
  let candidateCriticalComplete = 0;
  let jobCriticalComplete = 0;
  let jobCards = 0;

  for (const e of store.employees) {
    if (e.card.matchCanonical && Object.keys(e.card.matchCanonical).length) {
      candidateWithCanonical += 1;
    }
    if (criticalComplete(e.card, "candidate")) candidateCriticalComplete += 1;
  }
  for (const er of store.employers) {
    if (er.card.matchCanonical && Object.keys(er.card.matchCanonical).length) {
      jobWithCanonical += 1;
    }
    jobCards += 1;
    if (criticalComplete(er.card, "job")) jobCriticalComplete += 1;
    for (const j of er.jobs ?? []) {
      jobCards += 1;
      if (j.card.matchCanonical && Object.keys(j.card.matchCanonical).length) jobWithCanonical += 1;
      if (criticalComplete(j.card, "job")) jobCriticalComplete += 1;
    }
  }

  return {
    candidateCards: store.employees.length,
    jobCards,
    candidateWithCanonical,
    jobWithCanonical,
    candidateCriticalComplete,
    jobCriticalComplete,
  };
}

export { CRITICAL_CANDIDATE_KEYS, CRITICAL_JOB_KEYS };
