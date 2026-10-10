/** Lightweight DB phase timing (enable with DB_TIMING_LOG=1, default on in production). */
export function logDbTiming(phase: string, ms: number, extra?: Record<string, unknown>): void {
  if (process.env.DB_TIMING_LOG === "0") return;
  const detail = extra ? ` ${JSON.stringify(extra)}` : "";
  console.info(`[db-timing] ${phase} ${ms.toFixed(0)}ms${detail}`);
}

export function startDbTimer(): () => number {
  const t0 = performance.now();
  return () => performance.now() - t0;
}
