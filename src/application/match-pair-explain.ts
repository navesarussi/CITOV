import {
  computeBaseFit,
  combineFlexibility,
  overlap,
  scoreFromBase,
  scoreMatch,
  textScore,
} from "@/domain/matching";
import { rawHybridBase, scoreWithMode } from "@/domain/matching-scorers";
import {
  buildSemanticOptions,
  computeCalibratedSemanticFit,
  computeSemanticMatchBase,
  DEFAULT_HYBRID_WEIGHTS,
  type SegmentVectors,
} from "@/domain/semantic-matching";
import type { CandidateCard, JobCard } from "@/domain/types";
import { readHybridWeights, readMatchingMode, readQueueThreshold } from "./matching-config";
import type { AdminSettings } from "@/domain/types";

export type MatchPairExplanation = {
  ruleScore: number;
  hybridScore: number;
  semanticScore: number;
  queueThreshold: number;
  ruleQueued: boolean;
  hybridQueued: boolean;
  reason: string;
  ruleBreakdown: {
    baseFit: number;
    afterFlexibility: number;
    mustHaveOverlap: number;
    mustHavePenalty: number;
    combinedFlex: number;
  };
  semanticBreakdown: {
    roleCosine: number;
    skillsCosine: number;
    profileCosine: number;
    calibratedOverall: number;
    hybridBase: number;
    weights: { semantic: number; rule: number };
    mustHaveGate: boolean;
    mustHaveGateDetail: string;
  };
  segmentSimilarities: { role: number; skills: number; profile: number };
};

function mustHaveOverlap(job: JobCard, candidate: CandidateCard): number {
  if (!job.mustHaves.length) return 1;
  return overlap(
    job.mustHaves,
    candidate.skills.concat(candidate.desiredRole, candidate.licenses),
  );
}

function segmentCosines(cVec: SegmentVectors, jVec: SegmentVectors) {
  const cos = (a?: number[], b?: number[]) => {
    if (!a?.length || !b?.length) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i]! * b[i]!;
      na += a[i]! * a[i]!;
      nb += b[i]! * b[i]!;
    }
    const d = Math.sqrt(na) * Math.sqrt(nb);
    return d ? dot / d : 0;
  };
  return {
    role: cos(cVec.role, jVec.role),
    skills: cos(cVec.skills, jVec.skills),
    profile: cos(cVec.profile, jVec.profile),
  };
}

export function explainMatchPair(params: {
  candidate: CandidateCard;
  job: JobCard;
  candidateId: string;
  jobId: string;
  vectors?: { candidate: SegmentVectors; job: SegmentVectors };
  adminSettings?: AdminSettings | null;
}): MatchPairExplanation {
  const mode = readMatchingMode();
  const weights = readHybridWeights();
  const threshold = readQueueThreshold(params.adminSettings ?? undefined);

  const baseFit = computeBaseFit(params.candidate, params.job);
  const combinedFlex = combineFlexibility(
    params.candidate.flexibility,
    params.job.flexibility,
  );
  const ruleScore = scoreFromBase(baseFit, params.candidate, params.job);
  const mh = mustHaveOverlap(params.job, params.candidate);
  const mustPenalty =
    params.job.mustHaves.length === 0 ? 0 : 1 - mh;

  const { score: hybridScore, degraded } = scoreWithMode(
    "hybrid",
    params.candidate,
    params.job,
    params.vectors,
    weights,
  );
  const { score: semanticScore } = scoreWithMode(
    "semantic",
    params.candidate,
    params.job,
    params.vectors,
  );

  const opts = buildSemanticOptions(params.candidate, params.job);
  let semDetail = {
    roleCosine: 0,
    skillsCosine: 0,
    profileCosine: 0,
    calibratedOverall: 0,
    hybridBase: baseFit,
    mustHaveGate: false,
    mustHaveGateDetail: "אין וקטורים — semantic לא זמין",
  };
  let segs = { role: 0, skills: 0, profile: 0 };

  if (params.vectors && !degraded) {
    segs = segmentCosines(params.vectors.candidate, params.vectors.job);
    const cal = computeCalibratedSemanticFit(
      params.vectors.candidate,
      params.vectors.job,
      opts,
    );
    const hybridBase = rawHybridBase(
      params.candidate,
      params.job,
      params.vectors.candidate,
      params.vectors.job,
      weights,
    );
    const semBase = computeSemanticMatchBase(
      params.candidate,
      params.job,
      params.vectors.candidate,
      params.vectors.job,
      opts,
    );
    const gate = mh < 0.15 && params.job.mustHaves.length > 0;
    semDetail = {
      roleCosine: cal.roleCalibrated,
      skillsCosine: segs.skills,
      profileCosine: segs.profile,
      calibratedOverall: cal.calibrated,
      hybridBase,
      mustHaveGate: gate,
      mustHaveGateDetail: gate
        ? `must-have overlap ${(mh * 100).toFixed(0)}% — semantic blended down`
        : `must-have overlap ${(mh * 100).toFixed(0)}%`,
    };
    void semBase;
  }

  const parts: string[] = [];
  if (textScore(params.candidate.location, params.job.location) > 0.35) {
    parts.push("מיקום");
  }
  if (mh > 0) parts.push("חפיפת must-have");
  if (segs.role > 0.5) parts.push("semantic role");
  parts.push(`rule ${(ruleScore * 100).toFixed(0)}%`);
  parts.push(`hybrid ${(hybridScore * 100).toFixed(0)}%`);
  if (mode !== "rule" && !params.vectors) parts.push("ללא embeddings");

  return {
    ruleScore,
    hybridScore,
    semanticScore,
    queueThreshold: threshold,
    ruleQueued: ruleScore >= threshold,
    hybridQueued: hybridScore >= threshold,
    reason: parts.join(" · "),
    ruleBreakdown: {
      baseFit,
      afterFlexibility: ruleScore,
      mustHaveOverlap: mh,
      mustHavePenalty: mustPenalty,
      combinedFlex,
    },
    semanticBreakdown: {
      ...semDetail,
      weights,
    },
    segmentSimilarities: segs,
  };
}

export function quickRuleScore(candidate: CandidateCard, job: JobCard): number {
  return scoreMatch(candidate, job);
}
