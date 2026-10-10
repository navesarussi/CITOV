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
    <div className="atmosphere min-h-dvh">
      <main className="mx-auto w-full max-w-2xl px-5 py-10 pt-20">
        <SettingsMenu />
        <div className="enter mb-6">
          <Link href="/" className="text-sm font-medium text-[var(--accent)] hover:underline">
            ← {t.legal.back}
          </Link>
        </div>
        <article className="panel enter-delay rounded-[var(--panel-radius)] p-6 sm:p-8">
          <p className="eyebrow">CITOV</p>
          <h1 className="display-text mt-2">{title}</h1>
          <p className="mt-5 text-base leading-8 text-[var(--muted)]">{body}</p>
        </article>
      </main>
    </div>
  );
}
