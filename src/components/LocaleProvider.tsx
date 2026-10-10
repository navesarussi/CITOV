"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { getMessages, type Messages } from "@/i18n";
import { formatMessage } from "@/i18n/format";
import { DEFAULT_LOCALE, isLocale, localeDir, LOCALE_STORAGE_KEY, type Locale } from "@/i18n/types";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Messages;
  fmt: typeof formatMessage;
};

const LocaleContext = createContext<Ctx | null>(null);

function readStored(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const s = localStorage.getItem(LOCALE_STORAGE_KEY);
  return s && isLocale(s) ? s : DEFAULT_LOCALE;
}

function subscribeLocale(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function apply(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = localeDir(locale);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const storedLocale = useSyncExternalStore(
    subscribeLocale,
    readStored,
    () => DEFAULT_LOCALE,
  );
  const [localeOverride, setLocaleOverride] = useState<Locale | null>(null);
  const locale = localeOverride ?? storedLocale;
  const ready = typeof window !== "undefined";

  useEffect(() => {
    apply(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleOverride(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    apply(next);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ locale, setLocale, t: getMessages(locale), fmt: formatMessage }),
    [locale, setLocale],
  );

  const fallback: Ctx = {
    locale: DEFAULT_LOCALE,
    setLocale,
    t: getMessages(DEFAULT_LOCALE),
    fmt: formatMessage,
  };

  return <LocaleContext.Provider value={ready ? value : fallback}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const c = useContext(LocaleContext);
  if (!c) throw new Error("useLocale outside provider");
  return c;
}

export function useTranslation() {
  const { locale, setLocale, t, fmt } = useLocale();
  return { locale, setLocale, t, fmt };
}
