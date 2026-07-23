"use client";

import { formatAppVersion } from "@/lib/version";
import { useTranslation } from "@/components/LocaleProvider";

export function AppVersionFooter() {
  const { fmt, t } = useTranslation();

  return (
    <footer
      aria-label={fmt(t.app.versionLabel, { version: formatAppVersion() })}
      className="pointer-events-none fixed inset-x-0 bottom-2 z-40 text-center text-[10px] text-[var(--muted)] opacity-70"
    >
      {fmt(t.app.versionLabel, { version: formatAppVersion() })}
    </footer>
  );
}

export function AppVersionBadge() {
  const { fmt, t } = useTranslation();

  return (
    <p className="px-3 py-2 text-center text-[10px] text-[var(--muted)]">
      {fmt(t.app.versionLabel, { version: formatAppVersion() })}
    </p>
  );
}
