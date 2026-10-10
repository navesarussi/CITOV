"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import { AdminAiUsagePanel } from "@/components/admin/AdminAiUsagePanel";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminShell } from "@/components/AdminShell";
import { SettingsMenu } from "@/components/SettingsMenu";
import { Button } from "@/components/ui/Button";

type AdminStats = {
  employers: number;
  candidates: number;
  matches: {
    total: number;
    queued: number;
    approved: number;
    rejected: number;
  };
  aiUsage: {
    totalCalls: number;
    totalTokens: number;
    estimatedCostUsd: number;
    last24hCalls: number;
    last24hTokens: number;
    last24hCostUsd: number;
    totalCachedTokens?: number;
    estimatedCacheSavingsUsd?: number;
    byType: {
      type: string;
      calls: number;
      tokens: number;
      costUsd: number;
      cachedTokens?: number;
    }[];
    byDay?: { day: string; costUsd: number; calls: number; tokens: number }[];
    crowdLabels?: number;
    adminCrowdAgreementRate?: number | null;
  };
  engagement: {
    avgCandidateKnowledgePercent: number;
    avgJobKnowledgePercent: number;
    avgCandidateUserMessages: number;
    avgEmployerUserMessages: number;
  };
  users: number;
  reliability?: {
    averageScore: number;
    openNotes: number;
    lowScoreCandidates: { userId: string; name: string; score: number; openNotes: number }[];
  };
};

type Dashboard = {
  stats: AdminStats;
};

function formatUsd(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function formatTokens(value: number): string {
  return value.toLocaleString("he-IL");
}

export default function AdminPage() {
  const { status } = useSession();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const [res, aiRes] = await Promise.all([
        fetch("/api/admin/stats", { signal: controller.signal }),
        fetch("/api/health/ai", { signal: controller.signal }),
      ]);
      clearTimeout(timer);
      const json = await res.json();
      const ai = await aiRes.json().catch(() => null);
      if (!res.ok) {
        setError(json.error ?? "שגיאה בטעינה");
        return;
      }
      setData({ stats: json.stats ?? json });
      setAiMode(ai?.mode ?? null);
      setError(null);
    } catch {
      setError("הטעינה ארכה מדי או נכשלה. רעננו את העמוד.");
    }
  }, []);

  useDeferredEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") return;
    void load();
  }, [status, load]);

  const authError =
    status === "unauthenticated" ? "נדרשת התחברות עם Google" : null;
  const displayError = error ?? authError;

  if (!data && !displayError && status === "loading") {
    return (
      <div className="atmosphere flex min-h-dvh items-center justify-center px-5">
        <main className="text-center">
          <SettingsMenu />
          <p className="text-[var(--muted)]">טוען פורטל מנהלים…</p>
          <Link href="/" className="mt-4 inline-block text-sm text-[var(--accent)]">
            חזרה להתחלה
          </Link>
        </main>
      </div>
    );
  }

  if (displayError && !data) {
    const needsSignIn = status === "unauthenticated" || displayError.includes("התחברות");
    return (
      <div className="atmosphere flex min-h-dvh items-center justify-center px-5">
        <main className="panel max-w-lg rounded-[var(--panel-radius)] p-8 text-center">
          <SettingsMenu />
          <p className="text-[var(--muted)]">{displayError}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {needsSignIn ? (
              <Button
                variant="secondary"
                onClick={() => void signIn("google", { callbackUrl: "/admin" })}
              >
                התחברות עם Google
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => void load()}>
                נסו שוב
              </Button>
            )}
            <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
              חזרה להתחלה
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const { stats } = data;

  return (
    <AdminShell
      title="פורטל מנהלים"
      subtitle="סטטיסטיקות, עלויות AI, ומצב המערכת"
      actions={
        <>
          <Button
            variant="secondary"
            disabled={seeding}
            onClick={() => {
              setSeeding(true);
              setSeedMsg(null);
              void fetch("/api/admin/seed-demo", { method: "POST", body: "{}" })
                .then((r) => r.json())
                .then((d: { error?: string; skipped?: boolean; candidates?: number; jobs?: number }) => {
                  if (d.error) setSeedMsg(d.error);
                  else if (d.skipped) setSeedMsg("דמו כבר נטען (idempotent).");
                  else setSeedMsg(`נטענו ${d.candidates} מועמדים ו-${d.jobs} משרות + embeddings.`);
                  void load();
                })
                .catch(() => setSeedMsg("טעינת דמו נכשלה"))
                .finally(() => setSeeding(false));
            }}
            className="min-h-9 px-3 py-1.5 text-sm"
          >
            {seeding ? "טוען דמו…" : "טעינת דמו"}
          </Button>
          <Button
            variant="secondary"
            disabled={backfilling}
            onClick={() => {
              setBackfilling(true);
              setSeedMsg(null);
              void fetch("/api/admin/backfill-canonical", { method: "POST" })
                .then((r) => r.json())
                .then((d: { error?: string; employees?: number; employers?: number }) => {
                  if (d.error) setSeedMsg(d.error);
                  else
                    setSeedMsg(
                      `אינדקס ההתאמות עודכן — ${d.employees ?? 0} מועמדים, ${d.employers ?? 0} מעסיקים.`,
                    );
                  void load();
                })
                .catch(() => setSeedMsg("עדכון אינדקס ההתאמות נכשל"))
                .finally(() => setBackfilling(false));
            }}
            className="min-h-9 px-3 py-1.5 text-sm"
          >
            {backfilling ? "מעדכן…" : "עדכון אינדקס התאמות"}
          </Button>
          <Button variant="secondary" onClick={() => void load()} className="min-h-9 px-3 py-1.5 text-sm">
            רענון
          </Button>
        </>
      }
    >
      {seedMsg ? <p className="mb-3 text-sm text-[var(--muted)]">{seedMsg}</p> : null}

      <section className="enter-delay grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="מעסיקים" value={stats.employers} />
        <AdminStatCard label="מועמדים" value={stats.candidates} />
        <AdminStatCard
          label="מאצ׳ים"
          value={stats.matches.total}
          sub={`${stats.matches.approved} אושרו · ${stats.matches.queued} בתור`}
        />
        <AdminStatCard
          label="עלות AI (לפי מחירון)"
          value={formatUsd(stats.aiUsage.estimatedCostUsd)}
          sub={`${formatTokens(stats.aiUsage.totalTokens)} טוקנים · ${stats.aiUsage.totalCalls} קריאות · 24ש ${formatUsd(stats.aiUsage.last24hCostUsd)}`}
        >
          {(stats.aiUsage.totalCachedTokens ?? 0) > 0 ? (
            <p className="mt-2 text-xs text-[var(--accent)]">
              חיסכון ממטמון (הערכה): {formatUsd(stats.aiUsage.estimatedCacheSavingsUsd ?? 0)} ·{" "}
              {formatTokens(stats.aiUsage.totalCachedTokens ?? 0)} טוקנים ממטמון
            </p>
          ) : null}
          <ul className="mt-2 space-y-0.5 text-xs text-[var(--muted)]">
            {stats.aiUsage.byType.slice(0, 6).map((row) => (
              <li key={row.type}>
                {row.type}: {row.calls} · {formatTokens(row.tokens)} טוקנים · {formatUsd(row.costUsd)}
              </li>
            ))}
          </ul>
          <ul className="mt-2 max-h-24 space-y-0.5 overflow-y-auto text-xs text-[var(--muted)]">
            {(stats.aiUsage.byDay ?? []).slice(0, 7).map((d) => (
              <li key={d.day}>
                {d.day}: {formatUsd(d.costUsd)} · {d.calls} קריאות
              </li>
            ))}
          </ul>
          {(stats.aiUsage.crowdLabels ?? 0) > 0 ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              תיוג קהל: {stats.aiUsage.crowdLabels}
              {stats.aiUsage.adminCrowdAgreementRate != null
                ? ` · הסכמה מנהל↔קהל ${(stats.aiUsage.adminCrowdAgreementRate * 100).toFixed(0)}%`
                : null}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--muted)]">
            חישוב לפי טוקנים מה-API ומחירון Gemini — חשבונית Google היא מקור האמת.
          </p>
          <a
            href="https://aistudio.google.com/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            פתיחת חיוב / שימוש Google Gemini
          </a>
        </AdminStatCard>
      </section>

      <div className="enter-delay mt-4">
        <AdminAiUsagePanel />
      </div>

      <section className="enter-delay mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="ממוצע ידע רלוונטי — מועמדים"
          value={`${Math.round(stats.engagement.avgCandidateKnowledgePercent)}%`}
        />
        <AdminStatCard
          label="ממוצע ידע רלוונטי — משרות"
          value={`${Math.round(stats.engagement.avgJobKnowledgePercent)}%`}
        />
        <AdminStatCard
          label="ממוצע הודעות משתמש — מועמדים"
          value={stats.engagement.avgCandidateUserMessages.toFixed(1)}
        />
        <AdminStatCard
          label="ממוצע הודעות משתמש — מעסיקים"
          value={stats.engagement.avgEmployerUserMessages.toFixed(1)}
        />
      </section>

      <section className="panel enter-delay-2 mt-4 rounded-[var(--panel-radius)] p-5">
        <h2 className="text-sm font-semibold text-[var(--muted)]">פרומפטים והנחיות סוכן</h2>
        <p className="mt-2 text-sm text-[var(--ink)]">
          עריכת כל פרומפטי המערכת — שיחה, חילוץ קו״ח, התאמה ותרגום — עם גרסאות ותצוגה מקדימה.
        </p>
        <Link
          href="/admin/guidelines"
          className="mt-3 inline-flex min-h-9 items-center rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 px-4 text-sm font-medium text-[var(--hero)] hover:bg-[var(--accent)]/20"
        >
          מעבר לעורך הפרומפטים
        </Link>
      </section>

      <section className="panel enter-delay-2 mt-4 rounded-[var(--panel-radius)] p-5">
        <h2 className="text-sm font-semibold text-[var(--muted)]">פירוט מאצ׳ים</h2>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <span>בתור: {stats.matches.queued}</span>
          <span>אושרו: {stats.matches.approved}</span>
          <span>נדחו: {stats.matches.rejected}</span>
          <span>משתמשים רשומים: {stats.users}</span>
        </div>
      </section>

      <section className="panel enter-delay-2 mt-4 rounded-[var(--panel-radius)] p-5">
        <h2 className="text-sm font-semibold text-[var(--muted)]">אמינות מועמדים (פנימי)</h2>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <span>ממוצע: {stats.reliability?.averageScore ?? 100}</span>
          <span>סתירות פתוחות: {stats.reliability?.openNotes ?? 0}</span>
        </div>
        {(stats.reliability?.lowScoreCandidates?.length ?? 0) > 0 ? (
          <ul className="mt-3 space-y-1.5 text-xs text-[var(--ink)]">
            {stats.reliability!.lowScoreCandidates.map((c) => (
              <li key={c.userId} className="flex flex-wrap gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-[var(--muted)]">ציון {c.score}</span>
                {c.openNotes > 0 ? (
                  <span className="text-[var(--warn)]">{c.openNotes} פתוחות</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[var(--muted)]">אין סתירות פתוחות כרגע.</p>
        )}
      </section>

      {error ? (
        <p className="mt-4 rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
      ) : null}

      {aiMode ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          מנוע שיחה:{" "}
          <span className="font-medium text-[var(--accent)]">
            {aiMode === "gemini" ? "Gemini" : "כללים (ללא מפתח API)"}
          </span>
        </p>
      ) : null}
    </AdminShell>
  );
}
