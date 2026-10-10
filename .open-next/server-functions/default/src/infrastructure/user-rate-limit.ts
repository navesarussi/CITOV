import { ensureSchema } from "@/infrastructure/db/schema";
import { getPool } from "@/infrastructure/db/pool";
import { shouldUseMemoryStore } from "@/infrastructure/db/memory-store";

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterSec?: number };

function windowKey(userId: string, bucket: string): string {
  return `${bucket}::${userId}`;
}

function readLimit(opts?: { limit?: number; windowMs?: number }): {
  limit: number;
  windowMs: number;
} {
  const limit = opts?.limit ?? Number(process.env.AI_RATE_LIMIT_PER_USER ?? 40);
  const windowMs = opts?.windowMs ?? Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? 60_000);
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 40,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000,
  };
}

/** In-process limiter (dev memory store only). */
export function checkUserRateLimit(
  userId: string,
  opts?: { limit?: number; windowMs?: number },
): RateLimitResult {
  const { limit, windowMs } = readLimit(opts);
  if (limit <= 0) return { allowed: true };
  const now = Date.now();
  const key = windowKey(userId, "ai");
  let b = memoryBuckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(key, b);
  }
  if (b.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { allowed: true };
}

async function checkUserRateLimitDb(
  userId: string,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  await ensureSchema();
  const pool = await getPool();
  const now = Date.now();
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const windowEndMs = windowStartMs + windowMs;

  const r = await pool.query<{ request_count: number }>(
    `
    insert into user_rate_limit_windows (user_id, bucket, window_start, request_count)
    values ($1, $2, $3, 1)
    on conflict (user_id, bucket) do update set
      request_count = case
        when user_rate_limit_windows.window_start < $3 then 1
        else user_rate_limit_windows.request_count + 1
      end,
      window_start = case
        when user_rate_limit_windows.window_start < $3 then $3
        else user_rate_limit_windows.window_start
      end
    returning request_count
    `,
    [userId, bucket, windowStart],
  );
  const count = r.rows[0]?.request_count ?? 1;
  if (count > limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((windowEndMs - now) / 1000)),
    };
  }
  return { allowed: true };
}

/**
 * Fixed-window per-user limit persisted in Postgres (survives cold starts / multi-instance).
 * Falls back to in-memory when using the dev memory store.
 */
export async function checkUserRateLimitAsync(
  userId: string,
  opts?: { limit?: number; windowMs?: number; bucket?: string },
): Promise<RateLimitResult> {
  const { limit, windowMs } = readLimit(opts);
  if (limit <= 0) return { allowed: true };
  if (shouldUseMemoryStore()) {
    return checkUserRateLimit(userId, opts);
  }
  const bucket = opts?.bucket ?? "ai";
  try {
    return await checkUserRateLimitDb(userId, bucket, limit, windowMs);
  } catch (e) {
    console.warn("[rate-limit] db check failed, falling back to memory", e);
    return checkUserRateLimit(userId, opts);
  }
}
