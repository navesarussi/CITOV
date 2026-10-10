type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkUserRateLimit(
  userId: string,
  opts?: { limit?: number; windowMs?: number },
): { allowed: boolean; retryAfterSec?: number } {
  const limit = opts?.limit ?? Number(process.env.AI_RATE_LIMIT_PER_USER ?? 40);
  const windowMs = opts?.windowMs ?? Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? 60_000);
  if (!Number.isFinite(limit) || limit <= 0) return { allowed: true };
  const now = Date.now();
  let b = buckets.get(userId);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(userId, b);
  }
  if (b.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { allowed: true };
}
