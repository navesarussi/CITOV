import type { EmbeddingSegment } from "./card-embedding-text";
import type { HybridWeights } from "./semantic-matching";
import { DEFAULT_HYBRID_WEIGHTS, DEFAULT_SEGMENT_WEIGHTS } from "./semantic-matching";
import type { CandidateCard, FieldQuestion, JobCard } from "./types";
import { cardValue } from "./card-extras";
import { canonicalizeFieldToken } from "./match-canonical";

export type WorkDomain = "hospitality" | "technology" | "service" | "general";

export type SeniorityBand = "junior" | "mid" | "senior" | "lead";

const DOMAIN_FIELD_ALIASES: Record<string, WorkDomain> = {
  hospitality: "hospitality",
  technology: "technology",
  service: "service",
  general: "general",
};

export function workDomainFromFieldToken(field: string): WorkDomain {
  const canon = canonicalizeFieldToken(field);
  if (canon === "hospitality") return "hospitality";
  if (canon === "technology") return "technology";
  if (canon === "service") return "service";
  return "general";
}

export function detectWorkDomain(card: {
  field?: string;
  subField?: string;
  industry?: string;
  industryDomain?: string;
}): WorkDomain {
  const parts = [card.field, card.subField, card.industry, card.industryDomain]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  for (const p of parts) {
    if (/הייטק|software|tech|cyber|fintech|ai\b|פיתוח/.test(p)) return "technology";
    if (/מסעד|hospitality|hotel|מלון|בר\b|מטבח/.test(p)) return "hospitality";
    if (/שירות|support|crm|לקוחות/.test(p)) return "service";
  }
  if (card.field?.trim()) return workDomainFromFieldToken(card.field);
  return "general";
}

export function detectPairDomain(candidate: CandidateCard, job: JobCard): WorkDomain {
  const c = detectWorkDomain(candidate);
  const j = detectWorkDomain(job);
  if (c === j && c !== "general") return c;
  if (j !== "general") return j;
  if (c !== "general") return c;
  return "general";
}

/** Field keys prioritized per domain (subset of card-fields; hospitality keeps shifts). */
export const DOMAIN_CANDIDATE_FIELD_KEYS: Record<WorkDomain, string[]> = {
  hospitality: [
    "desiredRole",
    "field",
    "location",
    "skills",
    "languages",
    "shiftPreference",
    "nightShiftsOk",
    "weekendsOk",
    "salaryExpectation",
    "transportation",
    "personality",
    "flexibility",
  ],
  technology: [
    "desiredRole",
    "field",
    "subField",
    "industryDomain",
    "location",
    "remotePreference",
    "seniority",
    "experienceLevel",
    "experienceYears",
    "techStack",
    "skills",
    "yearsByTech",
    "languages",
    "englishLevel",
    "githubUrl",
    "portfolioUrl",
    "linkedinUrl",
    "securityClearance",
    "salaryMin",
    "salaryMax",
    "salaryExpectation",
    "flexibility",
  ],
  service: [
    "desiredRole",
    "field",
    "location",
    "skills",
    "languages",
    "customerFacingOk",
    "salaryExpectation",
    "shiftPreference",
    "flexibility",
  ],
  general: [],
};

export type RuleComponentWeights = {
  role: number;
  field: number;
  location: number;
  skills: number;
  soft: number;
  languages: number;
  personality: number;
  culture: number;
  salary: number;
  mustPenalty: number;
};

export const DEFAULT_RULE_WEIGHTS: RuleComponentWeights = {
  role: 0.3,
  field: 0.18,
  location: 0.14,
  skills: 0.18,
  soft: 0.04,
  languages: 0.05,
  personality: 0,
  culture: 0,
  salary: 0.09,
  mustPenalty: 0.1,
};

/** Tuned on labeled train set — technology pairs benefit from higher skills weight. */
export const DOMAIN_RULE_WEIGHTS: Partial<Record<WorkDomain, RuleComponentWeights>> = {
  technology: {
    role: 0.24,
    field: 0.12,
    location: 0.08,
    skills: 0.26,
    soft: 0.03,
    languages: 0.05,
    personality: 0,
    culture: 0,
    salary: 0.1,
    mustPenalty: 0.12,
  },
  hospitality: {
    role: 0.28,
    field: 0.16,
    location: 0.18,
    skills: 0.12,
    soft: 0.05,
    languages: 0.06,
    personality: 0,
    culture: 0,
    salary: 0.05,
    mustPenalty: 0.1,
  },
};

export const DOMAIN_HYBRID_WEIGHTS: Partial<Record<WorkDomain, HybridWeights>> = {
  technology: { semantic: 0.82, rule: 0.18 },
  hospitality: { semantic: 0.78, rule: 0.22 },
  service: { semantic: 0.8, rule: 0.2 },
};

export const DOMAIN_SEGMENT_WEIGHTS: Partial<
  Record<WorkDomain, Record<EmbeddingSegment, number>>
> = {
  technology: { role: 0.38, skills: 0.45, profile: 0.17 },
  hospitality: { role: 0.42, skills: 0.33, profile: 0.25 },
};

export function ruleWeightsForDomain(domain: WorkDomain): RuleComponentWeights {
  return DOMAIN_RULE_WEIGHTS[domain] ?? DEFAULT_RULE_WEIGHTS;
}

export function hybridWeightsForDomain(domain: WorkDomain): HybridWeights {
  return DOMAIN_HYBRID_WEIGHTS[domain] ?? DEFAULT_HYBRID_WEIGHTS;
}

export function segmentWeightsForDomain(
  domain: WorkDomain,
): Record<EmbeddingSegment, number> {
  return DOMAIN_SEGMENT_WEIGHTS[domain] ?? DEFAULT_SEGMENT_WEIGHTS;
}

/** Monthly gross NIS bands (typical IL hi-tech) for optional hard filter fallback. */
export const SALARY_BANDS_NIS: Record<
  string,
  Partial<Record<SeniorityBand, { min: number; max: number }>>
> = {
  "software developer": {
    junior: { min: 12_000, max: 18_000 },
    mid: { min: 22_000, max: 30_000 },
    senior: { min: 32_000, max: 45_000 },
    lead: { min: 40_000, max: 55_000 },
  },
  "full stack developer": {
    junior: { min: 14_000, max: 20_000 },
    mid: { min: 24_000, max: 32_000 },
    senior: { min: 34_000, max: 48_000 },
    lead: { min: 42_000, max: 58_000 },
  },
};

type DomainQuestionDef = {
  id: string;
  fieldKey: string;
  question: string;
};

const TECH_QUESTIONS: DomainQuestionDef[] = [
  {
    id: "domain:technology:seniority",
    fieldKey: "seniority",
    question: "איזו רמת בכירות מתארת אותך הכי טוב — junior, mid, senior או lead?",
  },
  {
    id: "domain:technology:techStack",
    fieldKey: "techStack",
    question: "מה סטack הטכנולוגי שאת/ה הכי בטוח/ה בו היום?",
  },
  {
    id: "domain:technology:remote",
    fieldKey: "remotePreference",
    question: "מה מתאים לך — remote, hybrid, או מהשרד בלבד?",
  },
  {
    id: "domain:technology:github",
    fieldKey: "githubUrl",
    question: "יש לך GitHub או תיק עבודות שאפשר לשתף?",
  },
  {
    id: "domain:technology:industry",
    fieldKey: "industryDomain",
    question: "באיזה תת-תחום את/ה הכי בית — cyber, fintech, AI, SaaS או משהו אחר?",
  },
  {
    id: "domain:technology:clearance",
    fieldKey: "securityClearance",
    question: "יש לך סיווג ביטחוני פעיל או בעבר?",
  },
];

const HOSPITALITY_QUESTIONS: DomainQuestionDef[] = [
  {
    id: "domain:hospitality:shifts",
    fieldKey: "shiftPreference",
    question: "איזה משמרות הכי מתאימות לך — בוקר, ערב, סופי שבוע?",
  },
  {
    id: "domain:hospitality:transport",
    fieldKey: "transportation",
    question: "איך את/ה מגיע/ה לעבודה בדרך כלל?",
  },
];

const DOMAIN_QUESTIONS: Partial<Record<WorkDomain, DomainQuestionDef[]>> = {
  technology: TECH_QUESTIONS,
  hospitality: HOSPITALITY_QUESTIONS,
};

function isFieldEmpty(card: CandidateCard, key: string): boolean {
  const v = cardValue(card, key);
  if (v == null) return true;
  if (typeof v === "number") return false;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return String(v).trim() === "";
}

export function builtinDomainQuestions(candidate: CandidateCard): FieldQuestion[] {
  const domain = detectWorkDomain(candidate);
  const defs = DOMAIN_QUESTIONS[domain];
  if (!defs?.length) return [];
  const now = new Date().toISOString();
  return defs
    .filter((d) => isFieldEmpty(candidate, d.fieldKey))
    .map((d) => ({
      id: d.id,
      field: DOMAIN_FIELD_ALIASES[domain] ?? domain,
      question: d.question,
      sourceJobId: "system",
      sourceEmployerId: "system",
      createdAt: now,
    }));
}

export function domainQuestionFieldKey(questionId: string): string | undefined {
  for (const defs of Object.values(DOMAIN_QUESTIONS)) {
    const hit = defs?.find((d) => d.id === questionId);
    if (hit) return hit.fieldKey;
  }
  return undefined;
}

export function applyDomainAnswerToCard(
  card: CandidateCard,
  questionId: string,
  answer: string,
): CandidateCard {
  const fieldKey = domainQuestionFieldKey(questionId);
  if (!fieldKey || !answer.trim()) return card;
  if (fieldKey === "techStack") {
    const parts = answer.split(/[,;|/]/).map((s) => s.trim()).filter(Boolean);
    const prev = card.techStack ?? [];
    const seen = new Set(prev.map((s) => s.toLowerCase()));
    const merged = [...prev];
    for (const p of parts) {
      if (!seen.has(p.toLowerCase())) {
        seen.add(p.toLowerCase());
        merged.push(p);
      }
    }
    return { ...card, techStack: merged, skills: merged.length ? [...new Set([...card.skills, ...merged])] : card.skills };
  }
  return { ...card, [fieldKey]: answer.trim() } as CandidateCard;
}

export function normalizeSeniority(raw: string | undefined): SeniorityBand | undefined {
  const n = (raw ?? "").trim().toLowerCase();
  if (!n) return undefined;
  if (/junior|זוטר|entry|0-2/.test(n)) return "junior";
  if (/mid|בינונ|middle/.test(n)) return "mid";
  if (/senior|בכיר|5\+|lead/.test(n) && !/lead|ראש צוות/.test(n)) return "senior";
  if (/lead|ראש צוות|staff|principal/.test(n)) return "lead";
  return undefined;
}
