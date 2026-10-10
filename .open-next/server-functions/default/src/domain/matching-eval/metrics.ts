import type { RelevanceLabel } from "./types";
import { RELEVANCE_GAIN } from "./types";

function labelGain(label: RelevanceLabel | undefined): number {
  if (!label) return 0;
  return RELEVANCE_GAIN[label];
}

/** Fraction of top-k ranks that are relevant (good or acceptable). */
export function precisionAtK(
  rankedCandidateIds: string[],
  isRelevant: (candidateId: string) => boolean,
  k: number,
): number {
  if (k <= 0) return 0;
  const top = rankedCandidateIds.slice(0, k);
  if (top.length === 0) return 0;
  const hits = top.filter((id) => isRelevant(id)).length;
  return hits / k;
}

/** Fraction of all relevant items found within top-k. */
export function recallAtK(
  rankedCandidateIds: string[],
  relevantIds: Set<string>,
  k: number,
): number {
  if (relevantIds.size === 0) return 1;
  const top = new Set(rankedCandidateIds.slice(0, k));
  let hits = 0;
  for (const id of relevantIds) {
    if (top.has(id)) hits++;
  }
  return hits / relevantIds.size;
}

/** Reciprocal rank of the first relevant item (1-indexed); 0 if none. */
export function reciprocalRank(rankedCandidateIds: string[], relevantIds: Set<string>): number {
  for (let i = 0; i < rankedCandidateIds.length; i++) {
    if (relevantIds.has(rankedCandidateIds[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/** Mean reciprocal rank across jobs. */
export function meanReciprocalRank(reciprocalRanks: number[]): number {
  if (reciprocalRanks.length === 0) return 0;
  return reciprocalRanks.reduce((a, b) => a + b, 0) / reciprocalRanks.length;
}

function dcgAtK(gains: number[], k: number): number {
  let sum = 0;
  const limit = Math.min(k, gains.length);
  for (let i = 0; i < limit; i++) {
    const g = gains[i];
    if (g <= 0) continue;
    sum += g / Math.log2(i + 2);
  }
  return sum;
}

/** nDCG@k from gains aligned with ranked order (unlabeled / bad = 0 gain). */
export function ndcgAtK(gainsInRankOrder: number[], k: number): number {
  const ideal = [...gainsInRankOrder].sort((a, b) => b - a);
  const dcg = dcgAtK(gainsInRankOrder, k);
  const idcg = dcgAtK(ideal, k);
  if (idcg === 0) return 1;
  return dcg / idcg;
}

export function gainForLabel(label: RelevanceLabel | undefined): number {
  return labelGain(label);
}

export function isRelevantLabel(label: RelevanceLabel | undefined): boolean {
  return label === "good" || label === "acceptable";
}
