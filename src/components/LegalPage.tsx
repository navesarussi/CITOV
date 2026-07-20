"use client";

import Link from "next/link";
import { SettingsMenu } from "@/components/SettingsMenu";
import { useTranslation } from "@/components/LocaleProvider";

export function LegalPage(props: {
  kind: "privacy" | "terms" | "about";
}) {
  const { t } = useTranslation();
  const title =
    props.kind === "privacy"
      ? t.legal.privacyTitle
      : props.kind === "terms"
        ? t.legal.termsTitle
        : t.legal.aboutTitle;
  const body =
    props.kind === "privacy"
      ? t.legal.privacyBody
      : props.kind === "terms"
        ? t.legal.termsBody
        : t.legal.aboutBody;

  return (
    <main className="mx-auto min-h-full w-full max-w-2xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-[var(--accent)]">
          ← {t.legal.back}
        </Link>
        <SettingsMenu />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--hero)]">{title}</h1>
      <p className="mt-4 text-base leading-7 text-[var(--muted)]">{body}</p>
    </main>
  );
}
