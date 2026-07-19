"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [googleAuth, setGoogleAuth] = useState(false);

  useEffect(() => {
    void fetch("/api/session")
      .then((r) => r.json())
      .then((d) => setGoogleAuth(Boolean(d.googleAuth)))
      .catch(() => setGoogleAuth(false));
  }, []);

  async function start(role: "employee" | "employer", demo: boolean) {
    setBusy(role + (demo ? "-demo" : ""));
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          demo,
          name:
            demo
              ? undefined
              : role === "employee"
                ? "מועמד/ת חדש/ה"
                : "מעסיק/ה חדש/ה",
        }),
      });
      const data = await res.json();
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
      <p className="text-sm font-medium tracking-wide text-[var(--accent)]">שידוך</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight text-[var(--hero)]">
        מוצאים עבודה בלי לחפש
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
        מדברים עם סוכן בטקסט חופשי. הוא ממלא כרטיס מפורט (עשרות שדות), משדך,
        ומציג לכל צד רק את מה שרלוונטי.
      </p>

      <section className="mt-8 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5">
        <h2 className="text-base font-semibold">כניסה עם Google</h2>
        {status === "authenticated" && session?.user ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-[var(--muted)]">
              מחובר/ת כ־{session.user.name ?? session.user.email}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void start("employee", false)}
                className="rounded-xl bg-[var(--hero)] px-4 py-3 text-sm font-medium text-white"
              >
                המשך כמחפש/ת עבודה
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void start("employer", false)}
                className="rounded-xl border border-[var(--stroke)] px-4 py-3 text-sm font-medium"
              >
                המשך כמעסיק/ה
              </button>
            </div>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              התנתקות
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <button
              type="button"
              disabled={!googleAuth || status === "loading"}
              onClick={() => void signIn("google", { callbackUrl: "/" })}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              כניסה עם Google
            </button>
            {!googleAuth ? (
              <p className="text-xs leading-5 text-[var(--muted)]">
                כדי להפעיל: הוסיפו ל־`.env.local` את{" "}
                <code>AUTH_GOOGLE_ID</code>, <code>AUTH_GOOGLE_SECRET</code> ו־
                <code>AUTH_SECRET</code> (ראו README). בינתיים אפשר דמו למטה.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void start("employee", true)}
          disabled={!!busy}
          className="rounded-2xl bg-[var(--hero)] p-5 text-start text-white"
        >
          <span className="block text-lg font-semibold">דמו עובד/ת</span>
          <span className="mt-2 block text-sm text-white/80">
            בלי Google — לבדיקה מהירה
          </span>
        </button>
        <button
          type="button"
          onClick={() => void start("employer", true)}
          disabled={!!busy}
          className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-5 text-start"
        >
          <span className="block text-lg font-semibold text-[var(--ink)]">
            דמו מעסיק/ה
          </span>
          <span className="mt-2 block text-sm text-[var(--muted)]">
            בלי Google — לבדיקה מהירה
          </span>
        </button>
      </div>
    </main>
  );
}
