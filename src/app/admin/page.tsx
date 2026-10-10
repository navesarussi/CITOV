"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { AdminPromptWorkbench } from "@/components/admin/AdminPromptWorkbench";
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
    byType: { type: string; calls: number; tokens: number; costUsd: number }[];
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
  prompts: {
    candidatePrompt: string;
    employerPrompt: string;
    updatedAt?: string;
    updatedBy?: string;
    isCustom?: boolean;
    defaultCandidatePrompt?: string;
    defaultEmployerPrompt?: string;
  };
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
  const [candidatePrompt, setCandidatePrompt] = useState("");
  const [employerPrompt, setEmployerPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [aiMode, setAiMode] = useState<string | null>(null);
  const [defaultCandidate, setDefaultCandidate] = useState("");
  const [defaultEmployer, setDefaultEmployer] = useState("");

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
      setData(json);
      setCandidatePrompt(json.prompts.candidatePrompt);
      setEmployerPrompt(json.prompts.employerPrompt);
      setIsCustom(Boolean(json.prompts.isCustom));
      setDefaultCandidate(json.prompts.defaultCandidatePrompt ?? json.prompts.candidatePrompt);
      setDefaultEmployer(json.prompts.defaultEmployerPrompt ?? json.prompts.employerPrompt);
      setAiMode(ai?.mode ?? null);
      setError(null);
    } catch {
      setError("הטעינה ארכה מדי או נכשלה. רעננו את העמוד.");
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setError("נדרשת התחברות עם Google");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dashboard fetch on auth ready
    void load();
  }, [status, load]);

  async function savePrompts() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidatePrompt, employerPrompt }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "שגיאה בשמירה");
        return;
      }
      if (json.prompts) {
        setCandidatePrompt(json.prompts.candidatePrompt);
        setEmployerPrompt(json.prompts.employerPrompt);
        setIsCustom(Boolean(json.prompts.isCustom));
        setData((prev) => (prev ? { ...prev, prompts: json.prompts } : prev));
      }
      setSaved(true);
      setError(null);
    } finally {
      setSaving(false);
    }
  }

  async function resetPrompts() {
    if (!confirm("לאפס לפרומפטים ברירת המחדל מהקבצים?")) return;
    setResetting(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/prompts", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "שגיאה באיפוס");
        return;
      }
      setCandidatePrompt(json.prompts.candidatePrompt);
      setEmployerPrompt(json.prompts.employerPrompt);
      setIsCustom(false);
      await load();
    } finally {
      setResetting(false);
    }
  }

  if (!data && !error && status === "loading") {
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

  if (error && !data) {
    const needsSignIn = status === "unauthenticated" || error.includes("התחברות");
    return (
      <div className="atmosphere flex min-h-dvh items-center justify-center px-5">
        <main className="panel max-w-lg rounded-[var(--panel-radius)] p-8 text-center">
          <SettingsMenu />
          <p className="text-[var(--muted)]">{error}</p>
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

  const { stats, prompts } = data;

  return (
    <AdminShell
      title="פורטל מנהלים"
      subtitle="סטטיסטיקות ועריכת פרומפטים בלייב לסוכני הצ׳אט"
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
          <Button variant="secondary" onClick={() => void load()} className="min-h-9 px-3 py-1.5 text-sm">
            רענון
          </Button>
        </>
      }
    >
      <nav className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/candidates" className="text-[var(--accent)] hover:underline">
          דפדפן מועמדים
        </Link>
        <Link href="/admin/employers" className="text-[var(--accent)] hover:underline">
          דפדפן מעסיקים
        </Link>
        <Link href="/admin/labeling" className="text-[var(--accent)] hover:underline">
          תיוג התאמות (live eval)
        </Link>
      </nav>
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
          label="עלות AI (הערכה)"
          value={formatUsd(stats.aiUsage.estimatedCostUsd)}
          sub={`${formatTokens(stats.aiUsage.totalTokens)} טוקנים · ${stats.aiUsage.totalCalls} קריאות · 24ש ${formatUsd(stats.aiUsage.last24hCostUsd)}`}
        >
          <ul className="mt-2 space-y-0.5 text-xs text-[var(--muted)]">
            {stats.aiUsage.byType.slice(0, 6).map((row) => (
              <li key={row.type}>
                {row.type}: {row.calls} · {formatTokens(row.tokens)} tok · {formatUsd(row.costUsd)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">
            הערכה פנימית (Gemini Flash + embedding rates ב־ai-pricing.ts) — חיוב בפועל ב־Google.
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

      <p className="mt-6 text-sm text-[var(--muted)]">
        פרומפטים נשלחים מ־<code className="rounded bg-[var(--chip)] px-1">/api/chat</code>
        {aiMode ? (
          <span className="ms-2 font-medium text-[var(--accent)]">
            · AI: {aiMode === "gemini" ? "Gemini" : "heuristic"}
          </span>
        ) : null}
      </p>

      <AdminPromptWorkbench
        candidatePrompt={candidatePrompt}
        employerPrompt={employerPrompt}
        defaultCandidate={defaultCandidate}
        defaultEmployer={defaultEmployer}
        onCandidateChange={setCandidatePrompt}
        onEmployerChange={setEmployerPrompt}
        onSave={() => void savePrompts()}
        onReset={() => void resetPrompts()}
        saving={saving}
        resetting={resetting}
        saved={saved}
        updatedAt={prompts.updatedAt}
        updatedBy={prompts.updatedBy}
        isCustom={isCustom}
      />
    </AdminShell>
  );
}
