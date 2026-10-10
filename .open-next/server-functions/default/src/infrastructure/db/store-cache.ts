import type { AdminSettings, FieldQuestion, StoreData } from "@/domain/types";

/**
 * Per-process caches. Warm serverless instances reuse these until any write
 * invalidates — critical under concurrent interactive traffic.
 */
let cachedStore: StoreData | null = null;
let cachedStoreAtMs = 0;

/** Per-process store cache TTL (ms). 0 = disabled. */
export const STORE_CACHE_TTL_MS = Number(process.env.STORE_CACHE_TTL_MS ?? 30_000);
let normalizedDataPresent = false;
let fieldQuestionsCache: FieldQuestion[] | null = null;
let adminSettingsCache: AdminSettings | null | undefined;

export function getCachedStore(): StoreData | null {
  return cachedStore;
}

export function setCachedStore(store: StoreData): void {
  cachedStore = store;
  cachedStoreAtMs = Date.now();
  normalizedDataPresent = true;
}

export function getCachedFieldQuestions(): FieldQuestion[] | null {
  return fieldQuestionsCache;
}

export function setCachedFieldQuestions(rows: FieldQuestion[]): void {
  fieldQuestionsCache = rows;
}

export function getCachedAdminSettings(): AdminSettings | null | undefined {
  return adminSettingsCache;
}

export function setCachedAdminSettings(settings: AdminSettings | undefined): void {
  adminSettingsCache = settings ?? null;
}

export function invalidateStoreCache(): void {
  cachedStore = null;
  cachedStoreAtMs = 0;
  fieldQuestionsCache = null;
  adminSettingsCache = undefined;
}

export function isStoreCacheFresh(): boolean {
  if (!cachedStore) return false;
  if (!Number.isFinite(STORE_CACHE_TTL_MS) || STORE_CACHE_TTL_MS <= 0) return true;
  return Date.now() - cachedStoreAtMs < STORE_CACHE_TTL_MS;
}

export function isNormalizedDataCached(): boolean {
  return normalizedDataPresent;
}

export function markNormalizedDataPresent(): void {
  normalizedDataPresent = true;
}
