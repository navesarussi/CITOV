"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type CacheEntry<T> = { data: T; fetchedAt: number };

type AdminCacheContextValue = {
  getCached: <T>(key: string, maxAgeMs: number) => T | null;
  setCached: <T>(key: string, data: T) => void;
  invalidate: (key: string) => void;
  prefetch: (key: string, fetcher: () => Promise<unknown>, maxAgeMs?: number) => void;
};

const AdminCacheContext = createContext<AdminCacheContextValue | null>(null);

export function AdminCacheProvider(props: { children: ReactNode }) {
  const store = useRef(new Map<string, CacheEntry<unknown>>());
  const inflight = useRef(new Map<string, Promise<unknown>>());

  const getCached = useCallback(<T,>(key: string, maxAgeMs: number): T | null => {
    const hit = store.current.get(key);
    if (!hit) return null;
    if (Date.now() - hit.fetchedAt > maxAgeMs) return null;
    return hit.data as T;
  }, []);

  const setCached = useCallback(<T,>(key: string, data: T) => {
    store.current.set(key, { data, fetchedAt: Date.now() });
  }, []);

  const invalidate = useCallback((key: string) => {
    store.current.delete(key);
  }, []);

  const prefetch = useCallback(
    (key: string, fetcher: () => Promise<unknown>, maxAgeMs = 60_000) => {
      if (getCached(key, maxAgeMs)) return;
      if (inflight.current.has(key)) return;
      const p = fetcher()
        .then((data) => {
          setCached(key, data);
          return data;
        })
        .finally(() => {
          inflight.current.delete(key);
        });
      inflight.current.set(key, p);
    },
    [getCached, setCached],
  );

  const value = useMemo(
    () => ({ getCached, setCached, invalidate, prefetch }),
    [getCached, setCached, invalidate, prefetch],
  );

  return <AdminCacheContext.Provider value={value}>{props.children}</AdminCacheContext.Provider>;
}

export function useAdminCache(): AdminCacheContextValue {
  const ctx = useContext(AdminCacheContext);
  if (!ctx) {
    throw new Error("useAdminCache requires AdminCacheProvider");
  }
  return ctx;
}

export function useAdminFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { maxAgeMs?: number; enabled?: boolean },
): { data: T | null; loading: boolean; error: string | null; refresh: () => Promise<void> } {
  const maxAge = options?.maxAgeMs ?? 45_000;
  const enabled = options?.enabled ?? true;
  const { getCached, setCached } = useAdminCache();
  const [data, setData] = useState<T | null>(() => getCached<T>(key, maxAge));
  const [loading, setLoading] = useState(enabled && !data);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetcher();
      setCached(key, next);
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, fetcher, key, setCached]);

  useEffect(() => {
    if (!enabled) return;
    const cached = getCached<T>(key, maxAge);
    if (cached) {
      queueMicrotask(() => {
        setData(cached);
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => {
      void refresh();
    });
  }, [enabled, getCached, key, maxAge, refresh]);

  return { data, loading, error, refresh };
}
