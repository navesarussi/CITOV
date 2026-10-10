/**
 * Map raw cosine similarity to a 0–1 fit scale using a high floor (Gemini cosines cluster ~0.77–1).
 * DEFAULT_COSINE_FLOOR (0.75) is tuned on holdout — override via MATCHING_COSINE_FLOOR.
 */
export function calibrateCosineSimilarity(cosine: number, floor: number): number {
  const lo = Math.max(0, Math.min(0.99, floor));
  if (cosine <= lo) return 0;
  return Math.max(0, Math.min(1, (cosine - lo) / (1 - lo)));
}

export const DEFAULT_COSINE_FLOOR = 0.75;

export function readCosineFloor(): number {
  const raw = Number(process.env.MATCHING_COSINE_FLOOR ?? DEFAULT_COSINE_FLOOR);
  return Number.isFinite(raw) ? Math.max(0, Math.min(0.99, raw)) : DEFAULT_COSINE_FLOOR;
}
