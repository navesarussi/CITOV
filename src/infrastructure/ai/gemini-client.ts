/**
 * Server-side Gemini access — key rotation, model cache, retries, and degraded-mode event logging.
 */
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { recordAppEventSafe } from "@/infrastructure/db/app-events";
import { captureServerException } from "@/infrastructure/observability/sentry-server";

const DEFAULT_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";

let keyIndex = 0;
const modelCache = new Map<string, ReturnType<ReturnType<typeof createGoogleGenerativeAI>>>();

export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  const primary = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (primary) keys.push(primary);
  const extra = process.env.GOOGLE_GENERATIVE_AI_API_KEYS?.split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  for (const k of extra ?? []) {
    if (!keys.includes(k)) keys.push(k);
  }
  return keys;
}

export function hasGeminiKey(): boolean {
  return getGeminiApiKeys().length > 0;
}

export function isRetryableGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|503|rate.?limit|too many requests|unavailable|resource_exhausted|overloaded|quota/i.test(
    msg,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function rotateGeminiKey(): void {
  const count = getGeminiApiKeys().length;
  if (count > 1) keyIndex = (keyIndex + 1) % count;
}

export function getGeminiModel(modelId = DEFAULT_MODEL) {
  const keys = getGeminiApiKeys();
  if (!keys.length) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  const key = keys[keyIndex % keys.length];
  const cacheKey = `${key.slice(-8)}:${modelId}`;
  let cached = modelCache.get(cacheKey);
  if (!cached) {
    const google = createGoogleGenerativeAI({ apiKey: key });
    cached = google(modelId);
    modelCache.set(cacheKey, cached);
  }
  return cached;
}

export function isForceGeminiFailure(): boolean {
  return process.env.FORCE_GEMINI_FAILURE === "true";
}

export function geminiCallTimeoutMs(): number {
  const n = Number(process.env.GEMINI_CALL_TIMEOUT_MS ?? 12_000);
  return Number.isFinite(n) && n > 1000 ? n : 12_000;
}

function withCallTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("gemini_timeout")), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  opts?: { maxAttempts?: number; timeoutMs?: number },
): Promise<T> {
  if (isForceGeminiFailure()) {
    throw new Error("forced_gemini_failure");
  }
  const maxAttempts = opts?.maxAttempts ?? 4;
  const timeoutMs = opts?.timeoutMs ?? geminiCallTimeoutMs();
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await withCallTimeout(fn(), timeoutMs);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (isRetryableGeminiError(err) && attempt < maxAttempts - 1) {
        recordAppEventSafe({
          kind: "ai_retry",
          severity: "warn",
          message: msg,
          meta: { attempt: attempt + 1, maxAttempts },
        });
      }
      if (!isRetryableGeminiError(err) || attempt >= maxAttempts - 1) {
        recordAppEventSafe({
          kind: "ai_failure",
          severity: "critical",
          message: msg,
          stack: err instanceof Error ? err.stack : undefined,
        });
        void captureServerException(err, { tags: { subsystem: "gemini" } });
        throw err;
      }
      rotateGeminiKey();
      modelCache.clear();
      await sleep(Math.min(8000, 600 * 2 ** attempt));
    }
  }
  throw lastErr;
}

export function defaultGeminiModelId(): string {
  return DEFAULT_MODEL;
}
