import { createGoogleGenerativeAI } from "@ai-sdk/google";

const DEFAULT_MODEL = "gemini-2.5-flash";

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

export async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  opts?: { maxAttempts?: number },
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableGeminiError(err) || attempt >= maxAttempts - 1) throw err;
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
