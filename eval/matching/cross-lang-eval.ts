import { createHash } from "node:crypto";
import { readQueueThreshold } from "../../src/application/matching-config";
import { scoreCandidateForJob, type MatchEmbeddingIndex } from "../../src/application/match-scoring";
import {
  enrichCandidateForRuleMatch,
  enrichJobForRuleMatch,
} from "../../src/domain/match-canonical";
import { scoreMatch } from "../../src/domain/matching";
import { rawHybridBase, rawRuleBase, rawSemanticBase } from "../../src/domain/matching-scorers";
import type { SegmentVectors } from "../../src/domain/semantic-matching";
import { readHybridWeightsForPair } from "../../src/application/matching-config";
import type { CandidateCard, JobCard } from "../../src/domain/types";
import {
  buildVariantCards,
  CROSS_LANG_PAIRS,
  type CrossLangPairSpec,
  type LangVariantId,
} from "./cross-lang-dataset";

export const CROSS_LANG_SCORE_TOLERANCE = 0.05;

const VARIANTS: LangVariantId[] = ["en", "he", "mixed"];

export type VariantScores = {
  rule: number;
  semantic: number;
  hybrid: number;
  queued: boolean;
};

function hashVec(seed: string, dim = 12): number[] {
  const buf = createHash("sha256").update(seed).digest();
  return Array.from({ length: dim }, (_, i) => buf[i % buf.length] / 127.5 - 1);
}

/** Shared pseudo-embeddings per logical pair (language-invariant reference vectors). */
export function buildCrossLangEmbeddingIndex(): MatchEmbeddingIndex {
  const candidate = new Map<string, SegmentVectors>();
  const job = new Map<string, SegmentVectors>();
  for (const spec of CROSS_LANG_PAIRS) {
    const id = spec.id;
    candidate.set(id, {
      role: hashVec(`${id}:c:role`),
      skills: hashVec(`${id}:c:skills`),
      profile: hashVec(`${id}:c:profile`),
    });
    job.set(id, {
      role: hashVec(`${id}:j:role`),
      skills: hashVec(`${id}:j:skills`),
      profile: hashVec(`${id}:j:profile`),
    });
  }
  return { candidate, job };
}

function scoreVariant(
  spec: CrossLangPairSpec,
  variant: LangVariantId,
  index: MatchEmbeddingIndex,
  threshold: number,
): VariantScores {
  const { candidate, job } = buildVariantCards(spec, variant);
  const pairId = spec.id;
  const cVec = index.candidate.get(pairId)!;
  const jVec = index.job.get(pairId)!;
  const c = enrichCandidateForRuleMatch(candidate);
  const j = enrichJobForRuleMatch(job);
  const weights = readHybridWeightsForPair(c, j);
  const rule = scoreMatch(candidate, job);
  const semantic = rawSemanticBase(c, j, cVec, jVec);
  const hybrid = rawHybridBase(c, j, cVec, jVec, weights);
  const prod = scoreCandidateForJob({
    candidate,
    job,
    candidateId: pairId,
    jobId: pairId,
    index,
    mode: "hybrid",
    queueThreshold: threshold,
  });
  return {
    rule,
    semantic,
    hybrid,
    queued: prod.queued,
  };
}

export type CrossLangPairResult = {
  pairId: string;
  baseline: VariantScores;
  variants: Record<LangVariantId, VariantScores>;
  pass: boolean;
  maxDelta: { rule: number; semantic: number; hybrid: number };
};

export type CrossLangEvalReport = {
  pairResults: CrossLangPairResult[];
  variantPassRates: Record<LangVariantId, number>;
  overallPassRate: number;
  failures: string[];
};

export function runCrossLangConsistencyEval(
  tolerance = CROSS_LANG_SCORE_TOLERANCE,
): CrossLangEvalReport {
  const index = buildCrossLangEmbeddingIndex();
  const threshold = readQueueThreshold(undefined);
  const pairResults: CrossLangPairResult[] = [];
  const failures: string[] = [];

  for (const spec of CROSS_LANG_PAIRS) {
    const baseline = scoreVariant(spec, "en", index, threshold);
    const variants = {} as Record<LangVariantId, VariantScores>;
    let pass = true;
    const maxDelta = { rule: 0, semantic: 0, hybrid: 0 };

    for (const v of VARIANTS) {
      variants[v] = scoreVariant(spec, v, index, threshold);
      if (v === "en") continue;
      const dRule = Math.abs(variants[v].rule - baseline.rule);
      const dSem = Math.abs(variants[v].semantic - baseline.semantic);
      const dHyb = Math.abs(variants[v].hybrid - baseline.hybrid);
      maxDelta.rule = Math.max(maxDelta.rule, dRule);
      maxDelta.semantic = Math.max(maxDelta.semantic, dSem);
      maxDelta.hybrid = Math.max(maxDelta.hybrid, dHyb);
      if (dRule > tolerance || dSem > tolerance || dHyb > tolerance) {
        pass = false;
        failures.push(
          `${spec.id}/${v}: Δrule=${dRule.toFixed(3)} Δsem=${dSem.toFixed(3)} Δhyb=${dHyb.toFixed(3)}`,
        );
      }
      if (variants[v].queued !== baseline.queued) {
        pass = false;
        failures.push(`${spec.id}/${v}: queue ${variants[v].queued} vs baseline ${baseline.queued}`);
      }
    }
    pairResults.push({ pairId: spec.id, baseline, variants, pass, maxDelta });
  }

  const variantPassRates = {} as Record<LangVariantId, number>;
  for (const v of VARIANTS) {
    const ok = pairResults.filter((p) => {
      const dRule = v === "en" ? 0 : Math.abs(p.variants[v].rule - p.baseline.rule);
      const dSem = v === "en" ? 0 : Math.abs(p.variants[v].semantic - p.baseline.semantic);
      const dHyb = v === "en" ? 0 : Math.abs(p.variants[v].hybrid - p.baseline.hybrid);
      return (
        dRule <= tolerance &&
        dSem <= tolerance &&
        dHyb <= tolerance &&
        p.variants[v].queued === p.baseline.queued
      );
    }).length;
    variantPassRates[v] = pairResults.length ? ok / pairResults.length : 1;
  }

  const overallPassRate = pairResults.filter((p) => p.pass).length / pairResults.length;

  return { pairResults, variantPassRates, overallPassRate, failures };
}
