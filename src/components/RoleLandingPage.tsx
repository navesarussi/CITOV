"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import { BrandMark } from "@/components/BrandMark";
import { DevLoginDialog } from "@/components/DevLoginDialog";
import { SettingsMenu } from "@/components/SettingsMenu";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/components/LocaleProvider";
import type { Role } from "@/domain/types";
import type { SessionFlagsPayload } from "@/lib/session-flags-server";
import {
  adminHomePath,
  clearSessionOnLogout,
  consumeSkipAutoLogin,
  readStoredUser,
  roleHomePath,
  roleLandingPath,
  startRoleSession,
} from "@/lib/client-session";
import { prefetchGoogleSignInCsrf, signInWithGoogleFast } from "@/lib/google-signin";

type SessionFlags = SessionFlagsPayload;

const PILLAR_ICONS = ["💬", "✦", "✓"] as const;

const EMPTY_FLAGS: SessionFlags = {
  googleAuth: false,
  openAuth: false,
  devAuth: false,
  testLoginOnLanding: false,
  allowDemo: false,
  memoryStore: false,
  signedIn: false,
  isAdmin: false,
  devUsers: [],
  email: null,
};

export function RoleLandingPage(props: { role: Role; initialFlags?: SessionFlags }) {
  const { role } = props;
  const landingPath = roleLandingPath(role);
  const otherRolePath = role === "employee" ? "/for-employers" : "/";
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, fmt } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [flags, setFlags] = useState<SessionFlags>(props.initialFlags ?? EMPTY_FLAGS);
  const [flagsReady, setFlagsReady] = useState(Boolean(props.initialFlags));
  const autoStarted = useRef(false);

  const copy =
    role === "employee"
      ? {
          heroTitle: t.home.heroTitleCandidate,
          description: t.home.description,
          enterLabel: t.home.iAmEmployee,
          openHint: t.home.openAuthHint,
          googleHint: t.home.candidateGoogleHint,
          googleButton: t.home.candidateGoogleButton,
          switchLabel: t.home.switchToEmployer,
        }
      : {
          heroTitle: t.home.heroTitleEmployer,
          description: t.home.employerDescription,
          enterLabel: t.home.iAmEmployer,
          openHint: t.home.employerOpenAuthHint,
          googleHint: t.home.employerGoogleHint,
          googleButton: t.home.employerGoogleButton,
          switchLabel: t.home.switchToCandidate,
        };

  const pillars = [
    { title: t.home.pillarChatTitle, body: t.home.pillarChatBody },
    { title: t.home.pillarMatchTitle, body: t.home.pillarMatchBody },
    { title: t.home.pillarApprovedTitle, body: t.home.pillarApprovedBody },
  ];

  async function loadFlags() {
    const r = await fetch("/api/session");
    const d = (await r.json()) as Partial<SessionFlags>;
    setFlags({
      googleAuth: Boolean(d.googleAuth),
      allowDemo: Boolean(d.allowDemo),
      openAuth: Boolean(d.openAuth),
      devAuth: Boolean(d.devAuth),
      testLoginOnLanding: Boolean(d.testLoginOnLanding),
      memoryStore: Boolean(d.memoryStore),
      signedIn: Boolean(d.signedIn),
      isAdmin: Boolean(d.isAdmin),
      email: typeof d.email === "string" ? d.email : null,
      devUsers: Array.isArray(d.devUsers) ? d.devUsers : [],
    });
  }

  useDeferredEffect(() => {
    if (props.initialFlags) return;
    void loadFlags()
      .catch(() => {
        setFlags(EMPTY_FLAGS);
      })
      .finally(() => setFlagsReady(true));
  }, [props.initialFlags]);

  useDeferredEffect(() => {
    if (status !== "authenticated") return;
    void loadFlags().catch(() => undefined);
  }, [status]);

  useEffect(() => {
    if (!flagsReady || !flags.googleAuth) return;
    void prefetchGoogleSignInCsrf();
  }, [flagsReady, flags.googleAuth]);

  useDeferredEffect(() => {
    if (!flagsReady || autoStarted.current) return;
    if (consumeSkipAutoLogin()) return;

    const isAuthed = status === "authenticated" && Boolean(session?.user);

    if (isAuthed && flags.googleAuth && flags.isAdmin) {
      autoStarted.current = true;
      router.replace(adminHomePath());
      return;
    }

    if (isAuthed && flags.googleAuth && !flags.isAdmin) {
      autoStarted.current = true;
      setEntering(true);
      void startRoleSession(role)
        .then(() => router.replace(roleHomePath(role)))
        .catch((e) => {
          autoStarted.current = false;
          setError(e instanceof Error ? e.message : t.api.internalError);
        })
        .finally(() => setEntering(false));
      return;
    }

    const stored = readStoredUser();
    // With Google auth, never enter workspace on localStorage alone — session may be expired (401/403 on APIs).
    if (stored?.role === role && !flags.googleAuth) {
      autoStarted.current = true;
      router.replace(roleHomePath(role));
    }
  }, [
    flagsReady,
    flags.googleAuth,
    flags.isAdmin,
    role,
    session?.user,
    status,
    router,
    t.api.internalError,
  ]);

  async function handleSignOut() {
    clearSessionOnLogout();
    const tasks: Promise<unknown>[] = [
      signOut({ redirect: false }).catch(() => undefined),
    ];
    if (flags.devAuth) {
      tasks.push(fetch("/api/dev/login", { method: "DELETE" }).catch(() => undefined));
    }
    await Promise.all(tasks);
    router.refresh();
  }

  async function startGoogleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogleFast({
        callbackUrl: landingPath,
        prompt: "select_account",
      });
    } catch (e) {
      setSigningIn(false);
      setError(e instanceof Error ? e.message : t.api.internalError);
    }
  }

  async function enterAsRole() {
    setError(null);
    setEntering(true);
    try {
      await startRoleSession(role);
      router.replace(roleHomePath(role));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.api.internalError);
    } finally {
      setEntering(false);
    }
  }

  const isAuthed = status === "authenticated" && Boolean(session?.user);
  const showGoogle = flags.googleAuth && !isAuthed;
  const showDevLogin = flags.testLoginOnLanding && !isAuthed;
  /** Open-enter only when neither Google nor test-login dialog is available. */
  const showOpenEnter = flags.openAuth && !flags.googleAuth && !showDevLogin;
  const bootstrapping =
    entering || signingIn || (isAuthed && flags.googleAuth && !flags.isAdmin);

  return (
    <div className="atmosphere">
      <main className="landing-scene">
        <div className="landing-orb landing-orb--1" aria-hidden />
        <div className="landing-orb landing-orb--2" aria-hidden />
        <SettingsMenu />

        <div className="landing-hero enter">
          <div className="landing-hero__copy">
            <BrandMark size={72} showWordmark align="start" />
            <h1 className="landing-hero__title enter-delay">{copy.heroTitle}</h1>
            <p className="landing-hero__lead enter-delay">{copy.description}</p>

            <div className="landing-pillars enter-delay-2">
              {pillars.map((pillar, i) => (
                <article key={pillar.title} className="landing-pillar">
                  <span className="landing-pillar__icon" aria-hidden>
                    {PILLAR_ICONS[i]}
                  </span>
                  <h2 className="landing-pillar__title">{pillar.title}</h2>
                  <p className="landing-pillar__body">{pillar.body}</p>
                </article>
              ))}
            </div>

            <Link href={otherRolePath} className="landing-role-switch enter-delay-2">
              {copy.switchLabel} →
            </Link>
          </div>

          <section className="landing-cta-card enter-delay-2" aria-label={t.home.ctaCardTitle}>
            <h2 className="landing-cta-card__title">{t.home.ctaCardTitle}</h2>
            <p className="landing-cta-card__hint">{t.home.ctaCardHint}</p>

            {error ? (
              <p className="mb-4 rounded-xl bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn)]">
                {error}
              </p>
            ) : null}

            {bootstrapping ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">{t.home.openingRole}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {showGoogle ? (
                  <>
                    <Button
                      disabled={status === "loading" || signingIn}
                      onClick={() => void startGoogleSignIn()}
                      className="cta-glow brand-gradient-bg min-h-12 w-full border-0 py-3.5 text-base font-semibold hover:bg-transparent hover:brightness-105"
                    >
                      {signingIn ? t.home.openingRole : copy.googleButton}
                    </Button>
                    <p className="text-center text-xs leading-5 text-[var(--muted)]">
                      {copy.googleHint}
                    </p>
                  </>
                ) : null}

                {showDevLogin ? (
                  <Button
                    variant={showGoogle ? "secondary" : undefined}
                    onClick={() => {
                      setError(null);
                      setLoginOpen(true);
                    }}
                    className={
                      showGoogle
                        ? "min-h-12 w-full py-3.5 text-base"
                        : "cta-glow brand-gradient-bg min-h-12 w-full border-0 py-3.5 text-base font-semibold hover:bg-transparent hover:brightness-105"
                    }
                  >
                    {t.home.devSignIn}
                  </Button>
                ) : null}

                {showOpenEnter ? (
                  <>
                    <p className="text-center text-xs leading-5 text-[var(--muted)]">
                      {copy.openHint}
                    </p>
                    <Button
                      disabled={entering}
                      onClick={() => void enterAsRole()}
                      className="cta-glow brand-gradient-bg min-h-12 w-full border-0 py-3.5 text-base font-semibold hover:bg-transparent hover:brightness-105"
                    >
                      {entering ? t.home.openingRole : copy.enterLabel}
                    </Button>
                  </>
                ) : null}

                {!showGoogle && !showOpenEnter && !showDevLogin ? (
                  <p className="text-center text-xs leading-5 text-[var(--muted)]">
                    {t.home.googleNotConfigured}
                  </p>
                ) : null}

                {isAuthed && flags.googleAuth ? (
                  <Button
                    variant="ghost"
                    onClick={() => void handleSignOut()}
                    className="w-full text-xs"
                  >
                    {fmt(t.home.connectedAs, {
                      name: session?.user?.name ?? session?.user?.email ?? "",
                    })}{" "}
                    · {t.home.signOut}
                  </Button>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </main>

      <DevLoginDialog
        open={loginOpen}
        users={flags.devUsers}
        defaultRole={role}
        onClose={() => setLoginOpen(false)}
        onDone={(redirect) => {
          setLoginOpen(false);
          router.replace(redirect);
        }}
        onError={setError}
      />
    </div>
  );
}
