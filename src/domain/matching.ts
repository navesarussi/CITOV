/**
 * Rule-based fit (token overlap + must-have penalty). Kept for structured
 * gates and hybrid blending; cross-language titles need semantic-matching.ts.
 */
import { enrichCandidateForRuleMatch, enrichJobForRuleMatch } from "./match-canonical";
import { skillTokensForOverlap } from "./skills-taxonomy";
import {
  detectPairDomain,
  ruleWeightsForDomain,
  type RuleComponentWeights,
} from "./work-domain";
import {
  candidateMonthlySalaryRange,
  jobMonthlySalaryRange,
  salaryMonthlyOverlapScore,
} from "./salary-normalize";
import type { CandidateCard, JobCard } from "./types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function overlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b.map(normalize));
  const hits = a.filter((item) => setB.has(normalize(item))).length;
  return hits / Math.max(a.length, b.length);
}

function skillsOverlap(candidateSkills: string[], jobSkills: string[]): number {
  if (candidateSkills.length === 0 || jobSkills.length === 0) return 0;
  const setB = new Set(skillTokensForOverlap(jobSkills));
  const tokensA = skillTokensForOverlap(candidateSkills);
  const hits = tokensA.filter((t) => setB.has(t)).length;
  return hits / Math.max(tokensA.length, setB.size);
}

export function textScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.7;
  const tokensA = na.split(/\s+/);
  const tokensB = new Set(nb.split(/\s+/));
  const hits = tokensA.filter((t) => tokensB.has(t)).length;
  return hits === 0 ? 0 : hits / Math.max(tokensA.length, tokensB.size);
}

export function computeRuleComponents(
  candidate: CandidateCard,
  job: JobCard,
  weights: RuleComponentWeights = ruleWeightsForDomain(detectPairDomain(candidate, job)),
) {
  const candSkills = [
    ...candidate.skills,
    ...(candidate.techStack ?? []),
  ];
  const role = textScore(candidate.desiredRole, job.title);
  const field = textScore(candidate.field, job.field);
  const location = textScore(candidate.location, job.location);
  const skills = skillsOverlap(candSkills, [...job.mustHaves, ...job.niceToHaves]);
  const soft = overlap(candidate.softSkills, job.niceToHaves);
  const languages = overlap(candidate.languages, job.requiredLanguages);
  // Personality / culture: embeddings only (profile segment) — not rule textScore (HE/EN skew).
  const personality = 0;
  const culture = 0;
  const salary = salaryMonthlyOverlapScore(
    candidateMonthlySalaryRange(candidate),
    jobMonthlySalaryRange(job),
  );

  const mustPenalty =
    job.mustHaves.length === 0
      ? 0
      : 1 -
        overlap(
          job.mustHaves,
          candidate.skills.concat(candidate.desiredRole, candidate.licenses),
        );

  const raw =
    role * weights.role +
    field * weights.field +
    location * weights.location +
    skills * weights.skills +
    soft * weights.soft +
    languages * weights.languages +
    personality * weights.personality +
    culture * weights.culture +
    salary * weights.salary -
    mustPenalty * weights.mustPenalty;

  const baseFit = Math.max(0, Math.min(1, raw));
  return {
    role,
    field,
    location,
    skills,
    soft,
    languages,
    personality,
    culture,
    salary,
    mustPenalty,
    baseFit,
  };
}

export function computeBaseFit(candidate: CandidateCard, job: JobCard): number {
  return computeRuleComponents(candidate, job).baseFit;
}

export function applyFlexibility(baseFit: number, flexibility: number): number {
  const f = Math.max(1, Math.min(10, flexibility));
  const strictness = (f - 1) / 9;
  const threshold = 0.25 + strictness * 0.45;
  if (baseFit < threshold * 0.5) return baseFit * 0.4;
  if (baseFit < threshold) return baseFit * (0.55 + (1 - strictness) * 0.35);
  return Math.min(1, baseFit + (1 - strictness) * 0.12);
}

/** Blend candidate + employer strictness (1 flexible … 10 exact). */
export function combineFlexibility(candidateFlex: number, jobFlex: number): number {
  const a = Math.max(1, Math.min(10, candidateFlex));
  const b = Math.max(1, Math.min(10, jobFlex));
  return Math.round((a + b) / 2);
}

export function explainMatch(candidate: CandidateCard, job: JobCard, score: number): string {
  const parts: string[] = [];
  if (textScore(candidate.field, job.field) > 0.4) {
    parts.push(`תחום דומה (${candidate.field || "?"} ↔ ${job.field || "?"})`);
  }
  if (textScore(candidate.desiredRole, job.title) > 0.4) {
    parts.push("התאמת תפקיד");
  }
  if (textScore(candidate.location, job.location) > 0.4) {
    parts.push("מיקום מתאים");
  }
  if (overlap(candidate.skills, job.mustHaves) > 0) {
    parts.push("כישורים שחופפים לדרישות");
  }
  parts.push(`גמישות ${candidate.flexibility}/10`);
  parts.push(`ציון ${(score * 100).toFixed(0)}`);
  return parts.join(" · ");
}

export function shouldQueueForEmployer(score: number): boolean {
  return score >= 0.28;
}

/** Production-equivalent match score (base fit + combined flexibility). */
export function scoreMatch(candidate: CandidateCard, job: JobCard): number {
  const c = enrichCandidateForRuleMatch(candidate);
  const j = enrichJobForRuleMatch(job);
  return scoreMatchCards(c, j);
}

function scoreMatchCards(candidate: CandidateCard, job: JobCard): number {
  return scoreFromBase(computeBaseFit(candidate, job), candidate, job);
}

export function scoreFromBase(
  base: number,
  candidate: CandidateCard,
  job: JobCard,
): number {
  const flex = combineFlexibility(candidate.flexibility, job.flexibility);
  return applyFlexibility(base, flex);
}
