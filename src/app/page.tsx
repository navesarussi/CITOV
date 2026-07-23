"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { SettingsMenu } from "@/components/SettingsMenu";
import { Button } from "@/components/ui/Button";
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
    <main className="relative mx-auto flex min-h-full w-full max-w-xl flex-col items-center px-5 py-16 pt-24 text-center sm:py-20">
      <SettingsMenu />

      <div className="enter">
        <BrandMark size={112} showWordmark />
      </div>

      <p className="enter-delay mt-8 max-w-md text-base leading-7 text-[var(--muted)] sm:text-lg">
        {t.home.description}
      </p>

      <section className="enter-delay-2 mt-10 w-full space-y-4">
        {error ? (
          <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">
            {error}
          </p>
        ) : null}
        {busy ? (
          <p className="text-sm text-[var(--muted)]">{t.home.openingRole}</p>
        ) : null}

        {canEnter ? (
          <div className="space-y-3">
            {status === "authenticated" && session?.user ? (
              <p className="text-sm text-[var(--muted)]">
                {fmt(t.home.connectedAs, {
                  name: session.user.name ?? session.user.email ?? "",
                })}
              </p>
            ) : (
              <p className="text-xs leading-5 text-[var(--muted)]">{t.home.openAuthHint}</p>
            )}
            <Button
              disabled={!!busy}
              onClick={() => void startCandidate(false)}
              className="brand-gradient-bg w-full border-0 shadow-[0_14px_32px_rgba(16,42,80,0.28)] hover:bg-transparent hover:brightness-105"
            >
              {t.home.iAmEmployee}
            </Button>
            {status === "authenticated" ? (
              <Button
                variant="ghost"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="w-full text-xs underline-offset-2 hover:underline"
              >
                {t.home.signOut}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              disabled={!googleAuth || status === "loading"}
              onClick={() => void signIn("google", { callbackUrl: "/" })}
              className="w-full"
            >
              {t.home.googleSignIn}
            </Button>
            <p className="text-xs leading-5 text-[var(--muted)]">
              {googleAuth ? t.home.afterSignInHint : t.home.googleNotConfigured}
            </p>
          </div>
        )}

        {allowDemo ? (
          <Button
            variant="secondary"
            onClick={() => void startCandidate(true)}
            disabled={!!busy}
            className="w-full border-dashed bg-white/40"
          >
            {t.home.demoEmployeeDev}
          </Button>
        ) : null}
      </section>
    </main>
  );
}
