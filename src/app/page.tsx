"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/components/LocaleProvider";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, fmt, locale } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const [googleAuth, setGoogleAuth] = useState(false);
  const [allowDemo, setAllowDemo] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    void fetch("/api/session")
      .then((r) => r.json())
      .then((d) => {
        setGoogleAuth(Boolean(d.googleAuth));
        setAllowDemo(Boolean(d.allowDemo));
        setIsAdmin(Boolean(d.isAdmin));
      })
      .catch(() => {
        setGoogleAuth(false);
        setAllowDemo(false);
      });
  }, []);

  async function start(role: "employee" | "employer", demo: boolean) {
    setBusy(role + (demo ? "-demo" : ""));
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, demo, locale }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      const user = data.user;
      if (!user?.id) return;
      localStorage.setItem("shidukh_user", JSON.stringify(user));
      router.push(role === "employee" ? "/employee" : "/employer");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-10">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <p className="text-sm font-medium tracking-wide text-[var(--accent)]">{t.app.name}</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight text-[var(--hero)]">
        {t.home.tagline}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
        {t.home.description}
      </p>

      <section className="mt-8 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <h2 className="text-base font-semibold">{t.home.realUsersTitle}</h2>
        {status === "authenticated" && session?.user ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-[var(--muted)]">
              {fmt(t.home.connectedAs, {
                name: session.user.name ?? session.user.email ?? "",
              })}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void start("employee", false)}
                className="rounded-xl bg-[var(--hero)] px-4 py-3 text-sm font-medium text-white"
              >
                {t.home.iAmEmployee}
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void start("employer", false)}
                className="rounded-xl border border-[var(--stroke)] px-4 py-3 text-sm font-medium"
              >
                {t.home.iAmEmployer}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              {t.home.signOut}
            </button>
            {isAdmin ? (
              <Link
                href="/admin"
                className="block rounded-xl border border-[var(--accent)] bg-[var(--bubble)] px-4 py-3 text-center text-sm font-medium text-[var(--hero)]"
              >
                {t.home.adminPortal}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <button
              type="button"
              disabled={!googleAuth || status === "loading"}
              onClick={() => void signIn("google", { callbackUrl: "/" })}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {t.home.googleSignIn}
            </button>
            <p className="text-xs leading-5 text-[var(--muted)]">
              {googleAuth ? t.home.afterSignInHint : t.home.googleNotConfigured}
            </p>
          </div>
        )}
      </section>

      {allowDemo ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void start("employee", true)}
            disabled={!!busy}
            className="rounded-2xl border border-dashed border-[var(--stroke)] p-4 text-start text-sm text-[var(--muted)]"
          >
            {t.home.demoEmployeeDev}
          </button>
          <button
            type="button"
            onClick={() => void start("employer", true)}
            disabled={!!busy}
            className="rounded-2xl border border-dashed border-[var(--stroke)] p-4 text-start text-sm text-[var(--muted)]"
          >
            {t.home.demoEmployerDev}
          </button>
        </div>
      ) : null}
    </main>
  );
}
