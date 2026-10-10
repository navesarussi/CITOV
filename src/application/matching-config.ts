import type { MatchScoreMode } from "@/domain/matching-scorers";
import type { HybridWeights } from "@/domain/semantic-matching";
import { DEFAULT_HYBRID_WEIGHTS } from "@/domain/semantic-matching";
import { detectPairDomain, hybridWeightsForDomain } from "@/domain/work-domain";
import type { AdminSettings, CandidateCard, JobCard } from "@/domain/types";

export function readMatchingMode(): MatchScoreMode {
  const raw = process.env.MATCHING_MODE?.trim().toLowerCase();
  if (raw === "rule" || raw === "semantic" || raw === "hybrid") return raw;
  return "hybrid";
}

export function readHybridWeights(): HybridWeights {
  const sem = Number(process.env.MATCHING_SEMANTIC_WEIGHT ?? DEFAULT_HYBRID_WEIGHTS.semantic);
  const rule = Number(process.env.MATCHING_RULE_WEIGHT ?? DEFAULT_HYBRID_WEIGHTS.rule);
  if (!Number.isFinite(sem) || !Number.isFinite(rule) || sem < 0 || rule < 0) {
    return DEFAULT_HYBRID_WEIGHTS;
  }
  return { semantic: sem, rule };
}

/** Domain presets unless env explicitly overrides hybrid weights. */
export function readHybridWeightsForPair(
  candidate: CandidateCard,
  job: JobCard,
): HybridWeights {
  if (
    process.env.MATCHING_SEMANTIC_WEIGHT != null ||
    process.env.MATCHING_RULE_WEIGHT != null
  ) {
    return readHybridWeights();
  }
  return hybridWeightsForDomain(detectPairDomain(candidate, job));
}

export function readQueueThreshold(settings?: AdminSettings | null): number {
  const fromDb = settings?.matchQueueThreshold;
  if (fromDb != null && Number.isFinite(fromDb)) return fromDb;
  const raw = Number(process.env.MATCHING_QUEUE_THRESHOLD ?? 0.6);
  return Number.isFinite(raw) ? raw : 0.6;
}

/** When hybrid/semantic degrades to rule-only, require at least this score to enter the queue. */
export function readDegradedRuleQueueFloor(): number {
  const raw = Number(process.env.MATCH_DEGRADED_RULE_QUEUE_FLOOR ?? 0.38);
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.38;
}
