import { en, type Messages } from "./en";
import { he } from "./he";
import type { Locale } from "./types";

const catalogs: Record<Locale, Messages> = { en, he };

export type { Messages };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

export { formatMessage } from "./format";
export type { Locale } from "./types";
export {
  DEFAULT_LOCALE,
  isLocale,
  localeDir,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from "./types";
