import type { Locale } from "@/i18n/types";

/** Heuristic: does free text look like it needs translation into `locale`? */
export function needsTranslationToLocale(text: string, locale: Locale): boolean {
  const sample = text.trim();
  if (!sample) return false;
  const hebrew = (sample.match(/[\u0590-\u05FF]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (locale === "he") return latin > hebrew * 2 && latin >= 12;
  if (locale === "en") return hebrew > latin * 2 && hebrew >= 8;
  return false;
}
