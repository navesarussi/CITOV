"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { DevLoginDialog } from "@/components/DevLoginDialog";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/components/LocaleProvider";
import type { Role } from "@/domain/types";
import type { SessionFlagsPayload } from "@/lib/session-flags-server";

type DevUser = { id: string; name: string; role: Role; email?: string };

/**
 * Internal test/demo entry — not linked from public landings.
 * Enable with ALLOW_TEST_LOGIN (default on in .env.example for local).
 */
export default function DemoLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [flags, setFlags] = useState<SessionFlagsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(true);
  const [role, setRole] = useState<Role>("employee");

  useEffect(() => {
    void fetch("/api/session")
      .then((r) => r.json())
      .then((d: Partial<SessionFlagsPayload & { devUsers?: DevUser[] }>) => {
        setFlags({
          googleAuth: Boolean(d.googleAuth),
          allowDemo: Boolean(d.allowDemo),
          openAuth: Boolean(d.openAuth),
          devAuth: Boolean(d.devAuth),
          testLoginOnLanding: Boolean(d.testLoginOnLanding),
          memoryStore: Boolean(d.memoryStore),
          isAdmin: Boolean(d.isAdmin),
          email: typeof d.email === "string" ? d.email : null,
          devUsers: Array.isArray(d.devUsers) ? d.devUsers : [],
        });
      })
      .catch(() => {
        setFlags({
          googleAuth: false,
          allowDemo: false,
          openAuth: false,
          devAuth: false,
          testLoginOnLanding: false,
          memoryStore: false,
          isAdmin: false,
          email: null,
          devUsers: [],
        });
      });
  }, []);

  if (!flags) {
    return (
      <main className="workspace-loading atmosphere">
        <p>{t.session.loading}</p>
      </main>
    );
  }

  if (!flags.devAuth) {
    return (
      <main className="atmosphere flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <BrandMark size={56} showWordmark />
        <h1 className="text-lg font-semibold text-[var(--hero)]">{t.demoPage.disabledTitle}</h1>
        <p className="max-w-md text-sm text-[var(--muted)]">{t.demoPage.disabledBody}</p>
        <Link href="/" className="text-sm text-[var(--accent)]">
          {t.session.backToStart}
        </Link>
      </main>
    );
  }

  return (
    <div className="atmosphere flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 p-6">
        <BrandMark size={56} showWordmark align="start" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--hero)]">
            {t.demoPage.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.demoPage.body}</p>
        </div>

        {error ? (
          <p className="rounded-xl bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn)]">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            variant={role === "employee" ? undefined : "secondary"}
            onClick={() => setRole("employee")}
            className="flex-1"
          >
            {t.devLogin.roleEmployee}
          </Button>
          <Button
            variant={role === "employer" ? undefined : "secondary"}
            onClick={() => setRole("employer")}
            className="flex-1"
          >
            {t.devLogin.roleEmployer}
          </Button>
        </div>

        <Button onClick={() => setLoginOpen(true)} className="w-full py-3.5 text-base font-semibold">
          {t.home.devSignIn}
        </Button>

        <p className="text-center text-xs text-[var(--muted)]">
          <Link href="/" className="text-[var(--accent)]">
            {t.demoPage.publicCandidate}
          </Link>
          {" · "}
          <Link href="/for-employers" className="text-[var(--accent)]">
            {t.demoPage.publicEmployer}
          </Link>
        </p>
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
