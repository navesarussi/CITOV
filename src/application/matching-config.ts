import type { MatchScoreMode } from "@/domain/matching-scorers";
import type { HybridWeights } from "@/domain/semantic-matching";
import { DEFAULT_HYBRID_WEIGHTS } from "@/domain/semantic-matching";

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

export function readQueueThreshold(): number {
  const raw = Number(process.env.MATCHING_QUEUE_THRESHOLD ?? 0.28);
  return Number.isFinite(raw) ? raw : 0.28;
}
