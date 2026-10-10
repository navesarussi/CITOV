/** Stable production match primary key — one row per job slot × candidate. */
export function stableMatchId(jobId: string, candidateId: string): string {
  return `pair__${jobId}__${candidateId}`;
}

export function parseStableMatchId(
  matchId: string,
): { jobId: string; candidateId: string } | null {
  if (!matchId.startsWith("pair__")) return null;
  const rest = matchId.slice(6);
  const sep = rest.indexOf("__");
  if (sep <= 0) return null;
  return { jobId: rest.slice(0, sep), candidateId: rest.slice(sep + 2) };
}
