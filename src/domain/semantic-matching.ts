import type { EmbeddingSegment, EmbeddingSegmentTexts } from "./card-embedding-text";
import {
  candidateEmbeddingTexts,
  isSegmentNonempty,
  jobEmbeddingTexts,
} from "./card-embedding-text";
import {
  calibrateCosineSimilarity,
  DEFAULT_COSINE_FLOOR,
  readCosineFloor,
} from "./matching-calibration";
import { combineFlexibility, computeBaseFit, textScore } from "./matching";
import { cosineSimilarity } from "./vector-similarity";
import type { CandidateCard, JobCard } from "./types";

export type SegmentVectors = Partial<Record<EmbeddingSegment, number[]>>;

export const DEFAULT_SEGMENT_WEIGHTS: Record<EmbeddingSegment, number> = {
  role: 0.45,
  skills: 0.35,
  profile: 0.2,
};

export type SemanticFitOptions = {
  weights?: Record<EmbeddingSegment, number>;
  cosineFloor?: number;
  candidateTexts?: EmbeddingSegmentTexts;
  jobTexts?: EmbeddingSegmentTexts;
};

function segmentActive(
  seg: EmbeddingSegment,
  candidateTexts?: EmbeddingSegmentTexts,
  jobTexts?: EmbeddingSegmentTexts,
): boolean {
  if (!candidateTexts || !jobTexts) return true;
  return (
    isSegmentNonempty(candidateTexts[seg]) && isSegmentNonempty(jobTexts[seg])
  );
}

/** Weighted mean of raw cosines; skips missing vectors and empty segment texts. */
export function computeSemanticSimilarity(
  candidate: SegmentVectors,
  job: SegmentVectors,
  weights: Record<EmbeddingSegment, number> = DEFAULT_SEGMENT_WEIGHTS,
  texts?: { candidate: EmbeddingSegmentTexts; job: EmbeddingSegmentTexts },
): number {
  let sum = 0;
  let wSum = 0;
  for (const seg of Object.keys(weights) as EmbeddingSegment[]) {
    if (texts && !segmentActive(seg, texts.candidate, texts.job)) continue;
    const a = candidate[seg];
    const b = job[seg];
    if (!a?.length || !b?.length) continue;
    sum += weights[seg] * cosineSimilarity(a, b);
    wSum += weights[seg];
  }
  if (wSum === 0) return 0;
  return sum / wSum;
}

export function computeRoleSegmentSimilarity(
  candidate: SegmentVectors,
  job: SegmentVectors,
  texts?: { candidate: EmbeddingSegmentTexts; job: EmbeddingSegmentTexts },
): number {
  if (texts && !segmentActive("role", texts.candidate, texts.job)) return 0;
  const a = candidate.role;
  const b = job.role;
  if (!a?.length || !b?.length) return 0;
  return cosineSimilarity(a, b);
}

export function computeCalibratedSemanticFit(
  candidateVec: SegmentVectors,
  jobVec: SegmentVectors,
  opts: SemanticFitOptions = {},
): { rawCosine: number; calibrated: number; roleCalibrated: number } {
  const floor = opts.cosineFloor ?? readCosineFloor();
  const texts =
    opts.candidateTexts && opts.jobTexts
      ? { candidate: opts.candidateTexts, job: opts.jobTexts }
      : undefined;
  const rawCosine = computeSemanticSimilarity(
    candidateVec,
    jobVec,
    opts.weights,
    texts,
  );
  const rawRole = computeRoleSegmentSimilarity(candidateVec, jobVec, texts);
  return {
    rawCosine,
    calibrated: calibrateCosineSimilarity(rawCosine, floor),
    roleCalibrated: calibrateCosineSimilarity(rawRole, floor),
  };
}

function normToken(s: string): string {
  return s.trim().toLowerCase();
}

function poolTokens(candidate: CandidateCard): string[] {
  return candidate.skills
    .concat(candidate.languages, candidate.softSkills, candidate.licenses)
    .concat([candidate.desiredRole, candidate.hebrewLevel, candidate.englishLevel])
    .map(normToken)
    .filter(Boolean);
}

function mustHaveHit(candidate: CandidateCard, must: string): boolean {
  const m = normToken(must);
  if (!m) return true;
  const pool = poolTokens(candidate);
  if (pool.some((p) => p === m || p.includes(m) || m.includes(p))) return true;
  if (/עברית|hebrew/.test(m)) {
    return pool.some((p) => /עברית|hebrew|שוטף/.test(p));
  }
  if (/english|אנגלית/.test(m)) {
    return pool.some((p) => /english|אנגלית|שוטף/.test(p));
  }
  if (/שירות|service/.test(m)) {
    return pool.some((p) => /שירות|service|customer/.test(p));
  }
  return false;
}

/** Fraction of job must-haves matched (token + obvious bilingual aliases). */
export function mustHaveOverlapRatio(candidate: CandidateCard, job: JobCard): number {
  if (job.mustHaves.length === 0) return 1;
  const hits = job.mustHaves.filter((m) => mustHaveHit(candidate, m)).length;
  return hits / job.mustHaves.length;
}

/** Explicit language requirement in must-haves not reflected on the candidate card. */
export function mustHaveLanguageGap(candidate: CandidateCard, job: JobCard): boolean {
  for (const must of job.mustHaves) {
    const m = normToken(must);
    if (/עברית|hebrew/.test(m) && !mustHaveHit(candidate, must)) return true;
    if (/english|אנגלית/.test(m) && !mustHaveHit(candidate, must)) return true;
  }
  return false;
}

/** @deprecated use mustHaveOverlapRatio — kept for tests */
export function computeMustHavePenalty(candidate: CandidateCard, job: JobCard): number {
  return 1 - mustHaveOverlapRatio(candidate, job);
}

/**
 * When must-haves are incomplete, scale down — stricter when employer/candidate
 * want an exact match (high flexibility score).
 */
export function applyMustHaveGate(
  base: number,
  candidate: CandidateCard,
  job: JobCard,
): number {
  const overlap = mustHaveOverlapRatio(candidate, job);
  if (overlap >= 1) return base;
  const flex = combineFlexibility(candidate.flexibility, job.flexibility);
  const strictness = (flex - 1) / 9;
  const factor = 0.2 + 0.8 * overlap - strictness * (1 - overlap) * 0.25;
  return Math.max(0, Math.min(1, base * Math.max(0.15, factor)));
}

export function computeSemanticMatchBase(
  candidate: CandidateCard,
  job: JobCard,
  candidateVec: SegmentVectors,
  jobVec: SegmentVectors,
  opts: SemanticFitOptions = {},
): number {
  const candTexts = opts.candidateTexts ?? undefined;
  const jobTexts = opts.jobTexts ?? undefined;
  const { calibrated } = computeCalibratedSemanticFit(candidateVec, jobVec, {
    ...opts,
    candidateTexts: candTexts,
    jobTexts: jobTexts,
  });
  const penalty = 1 - mustHaveOverlapRatio(candidate, job);
  return Math.max(0, Math.min(1, calibrated - penalty * 0.12));
}

export type HybridWeights = {
  semantic: number;
  rule: number;
};

export const DEFAULT_HYBRID_WEIGHTS: HybridWeights = {
  semantic: 0.8,
  rule: 0.2,
};

export function readRoleBoostEnabled(): boolean {
  return process.env.MATCHING_ROLE_BOOST !== "false";
}

export type HybridFitTrace = {
  value: number;
  ruleBase: number;
  semanticBase: number;
  preGateBlend: number;
  roleBoostApplied: boolean;
  roleCalibrated: number;
  ruleRoleScore: number;
  postRoleBoost: number;
  mustHaveOverlap: number;
  mustHaveLanguageGap: boolean;
  afterMustHaveGate: number;
};

export function computeHybridBaseFitDetailed(
  candidate: CandidateCard,
  job: JobCard,
  candidateVec: SegmentVectors,
  jobVec: SegmentVectors,
  weights: HybridWeights = DEFAULT_HYBRID_WEIGHTS,
  opts: SemanticFitOptions = {},
): HybridFitTrace {
  const rule = computeBaseFit(candidate, job);
  const sem = computeSemanticMatchBase(candidate, job, candidateVec, jobVec, opts);
  const wSum = weights.semantic + weights.rule;
  let preGateBlend = wSum <= 0 ? rule : (weights.semantic * sem + weights.rule * rule) / wSum;
  const { roleCalibrated } = computeCalibratedSemanticFit(candidateVec, jobVec, {
    ...opts,
    candidateTexts: opts.candidateTexts,
    jobTexts: opts.jobTexts,
  });
  const ruleRole = textScore(candidate.desiredRole, job.title);
  let roleBoostApplied = false;
  let postRoleBoost = preGateBlend;
  if (
    readRoleBoostEnabled() &&
    roleCalibrated >= 0.35 &&
    ruleRole < 0.2
  ) {
    roleBoostApplied = true;
    postRoleBoost = Math.max(preGateBlend, 0.42 + 0.55 * roleCalibrated);
  }
  let blend = postRoleBoost;
  const mhOverlap = mustHaveOverlapRatio(candidate, job);
  const langGap = mustHaveLanguageGap(candidate, job);
  if (langGap) {
    blend *= 0.55;
  } else if (mhOverlap < 1) {
    blend = applyMustHaveGate(blend, candidate, job);
  }
  const value = Math.max(0, Math.min(1, blend));
  return {
    value,
    ruleBase: rule,
    semanticBase: sem,
    preGateBlend,
    roleBoostApplied,
    roleCalibrated,
    ruleRoleScore: ruleRole,
    postRoleBoost,
    mustHaveOverlap: mhOverlap,
    mustHaveLanguageGap: langGap,
    afterMustHaveGate: value,
  };
}

export function computeHybridBaseFit(
  candidate: CandidateCard,
  job: JobCard,
  candidateVec: SegmentVectors,
  jobVec: SegmentVectors,
  weights: HybridWeights = DEFAULT_HYBRID_WEIGHTS,
  opts: SemanticFitOptions = {},
): number {
  return computeHybridBaseFitDetailed(
    candidate,
    job,
    candidateVec,
    jobVec,
    weights,
    opts,
  ).value;
}

export function buildSemanticOptions(
  candidate: CandidateCard,
  job: JobCard,
): SemanticFitOptions {
  return {
    cosineFloor: readCosineFloor(),
    candidateTexts: candidateEmbeddingTexts(candidate),
    jobTexts: jobEmbeddingTexts(job),
  };
}
