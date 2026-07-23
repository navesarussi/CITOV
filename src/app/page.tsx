"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { SettingsMenu } from "@/components/SettingsMenu";
import { useTranslation } from "@/components/LocaleProvider";
import {
  getOrCreateDeviceId,
  readRoleDefault,
  readStoredUser,
  roleHomePath,
  writeRoleDefault,
  writeStoredUser,
} from "@/lib/client-session";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, fmt, locale } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [googleAuth, setGoogleAuth] = useState(false);
  const [allowDemo, setAllowDemo] = useState(false);
  const [openAuth, setOpenAuth] = useState(true);
  const [flagsReady, setFlagsReady] = useState(false);
  const autoStarted = useRef(false);

  useEffect(() => {
    void fetch("/api/session")
      .then((r) => r.json())
      .then((d) => {
        setGoogleAuth(Boolean(d.googleAuth));
        setAllowDemo(Boolean(d.allowDemo));
        setOpenAuth(Boolean(d.openAuth));
      })
      .catch(() => {
        setGoogleAuth(false);
        setAllowDemo(false);
        setOpenAuth(true);
      })
      .finally(() => setFlagsReady(true));
  }, []);

  async function startCandidate(demo: boolean) {
    setBusy(demo ? "employee-demo" : "employee");
    setError(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "employee",
          demo,
          locale,
          deviceId: getOrCreateDeviceId(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      const user = data.user;
      if (!user?.id) {
        setError(t.api.internalError);
        return;
      }
      writeStoredUser(user);
      writeRoleDefault("employee");
      router.replace(roleHomePath("employee"));
    } catch {
      setError(t.api.internalError);
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (!flagsReady || autoStarted.current) return;
    const stored = readStoredUser();
    // Candidate-only phase: resume employee sessions; skip employer redirects.
    if (stored?.role === "employee") {
      autoStarted.current = true;
      router.replace(roleHomePath("employee"));
      return;
    }
    const roleDefault = readRoleDefault();
    if (roleDefault === "employee" && (openAuth || allowDemo)) {
      autoStarted.current = true;
      void startCandidate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot entry
  }, [flagsReady, openAuth, allowDemo, router]);

  const canEnter = openAuth || (status === "authenticated" && session?.user);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center px-5 py-12 pt-20 text-center">
      <SettingsMenu />

      <div className="brand-enter">
        <BrandMark size={96} showWordmark />
      </div>

      <p className="brand-enter-delay mt-8 max-w-md text-base leading-7 text-[var(--muted)]">
        {t.home.description}
      </p>

      <section className="brand-enter-delay-2 premium-panel mt-10 w-full rounded-[1.5rem] p-6 sm:p-8">
        {error ? (
          <p className="mb-4 rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">
            {error}
          </p>
        ) : null}
        {busy ? (
          <p className="mb-4 text-sm text-[var(--muted)]">{t.home.openingRole}</p>
        ) : null}

        {canEnter ? (
          <div className="space-y-4">
            {status === "authenticated" && session?.user ? (
              <p className="text-sm text-[var(--muted)]">
                {fmt(t.home.connectedAs, {
                  name: session.user.name ?? session.user.email ?? "",
                })}
              </p>
            ) : (
              <p className="text-xs leading-5 text-[var(--muted)]">{t.home.openAuthHint}</p>
            )}
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void startCandidate(false)}
              className="brand-gradient-bg w-full cursor-pointer rounded-xl px-4 py-3.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(16,42,80,0.28)] transition duration-200 hover:brightness-105 disabled:opacity-50"
            >
              {t.home.iAmEmployee}
            </button>
            {status === "authenticated" ? (
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="cursor-pointer text-xs text-[var(--muted)] underline-offset-2 transition hover:underline"
              >
                {t.home.signOut}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              disabled={!googleAuth || status === "loading"}
              onClick={() => void signIn("google", { callbackUrl: "/" })}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--hero)] px-4 py-3.5 text-sm font-medium text-white transition duration-200 hover:bg-[var(--accent-strong)] disabled:opacity-50"
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
        <button
          type="button"
          onClick={() => void startCandidate(true)}
          disabled={!!busy}
          className="mt-6 w-full cursor-pointer rounded-2xl border border-dashed border-[var(--stroke)] bg-white/60 p-4 text-sm text-[var(--muted)] transition duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {t.home.demoEmployeeDev}
        </button>
      ) : null}
    </main>
  );
}
