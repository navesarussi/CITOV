"use client";

import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import { useTranslation } from "@/components/LocaleProvider";

const KEY = "citov_consent_v1";

function readConsentVisible(): boolean {
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return true;
  }
}

function subscribeConsent(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function ConsentBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const storedVisible = useSyncExternalStore(subscribeConsent, readConsentVisible, () => false);
  const show = storedVisible && !dismissed;

  if (!show) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[70] border-t border-[var(--stroke)] bg-[var(--surface)] p-4 shadow-lg">
      <p className="mx-auto max-w-2xl text-sm leading-6 text-[var(--ink)]">
        {t.settings.consentBanner}{" "}
        <Link href="/legal/privacy" className="font-medium text-[var(--accent)] underline">
          {t.settings.privacy}
        </Link>
      </p>
      <button
        type="button"
        className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        onClick={() => {
          localStorage.setItem(KEY, "1");
          setDismissed(true);
        }}
      >
        {t.settings.consentAccept}
      </button>
    </div>
  );
}
