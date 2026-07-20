"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

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
  };
  users: number;
};

type Dashboard = {
  stats: AdminStats;
  prompts: {
    candidatePrompt: string;
    employerPrompt: string;
    updatedAt?: string;
    updatedBy?: string;
    isCustom?: boolean;
  };
};

const PLACEHOLDER_HELP =
  "{{known_facts}}, {{current_card}}, {{missing_field_key}}, {{pending_field_questions}}, {{recent_agent_questions}} — היסטוריית השיחה נשלחת אוטומטית כ-messages";

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
  const [saved, setSaved] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "שגיאה בטעינה");
      return;
    }
    setData(json);
    setCandidatePrompt(json.prompts.candidatePrompt);
    setEmployerPrompt(json.prompts.employerPrompt);
    setIsCustom(Boolean(json.prompts.isCustom));
    setError(null);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
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
      setSaved(true);
      setIsCustom(true);
      await load();
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

  if (status === "loading" || (!data && !error)) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center text-[var(--muted)]">
        טוען פורטל מנהלים…
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-[var(--muted)]">{error}</p>
        <Link href="/" className="mt-4 inline-block text-[var(--accent)]">
          חזרה להתחלה
        </Link>
      </main>
    );
  }

  if (!data) return null;

  const { stats, prompts } = data;

  return (
    <main className="mx-auto min-h-full w-full max-w-5xl px-4 py-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm font-medium text-[var(--accent)]">
            שידוך
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--hero)]">
            פורטל מנהלים
          </h1>
          <p className="text-sm text-[var(--muted)]">
            סטטיסטיקות ועריכת פרומפטים בלייב לסוכני הצ׳אט
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
        >
          רענון
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="מעסיקים" value={stats.employers} />
        <StatCard label="מועמדים" value={stats.candidates} />
        <StatCard
          label="מאצ׳ים"
          value={stats.matches.total}
          sub={`${stats.matches.approved} אושרו · ${stats.matches.queued} בתור`}
        />
        <StatCard
          label="עלות AI (הערכה)"
          value={formatUsd(stats.aiUsage.estimatedCostUsd)}
          sub={`${formatTokens(stats.aiUsage.totalTokens)} טוקנים · ${stats.aiUsage.totalCalls} קריאות`}
        />
      </section>

      <section className="premium-panel mt-4 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-[var(--muted)]">פירוט מאצ׳ים</h2>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <span>בתור: {stats.matches.queued}</span>
          <span>אושרו: {stats.matches.approved}</span>
          <span>נדחו: {stats.matches.rejected}</span>
          <span>משתמשים רשומים: {stats.users}</span>
        </div>
      </section>

      <section className="mt-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--muted)]">
            הפרומפטים נשלחים בכל הודעת צ׳אט (מצב Gemini).{" "}
            <span className="font-medium text-[var(--ink)]">
              {isCustom ? "מקור: עריכה מותאמת (DB)" : "מקור: קבצי ברירת מחדל"}
            </span>
          </p>
        </div>

        {error ? (
          <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">
            {error}
          </p>
        ) : null}

        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold">פרומפט סוכן מועמדים</h2>
            <span className="max-w-xl text-xs leading-5 text-[var(--muted)]">
              {PLACEHOLDER_HELP}
            </span>
          </div>
          <textarea
            value={candidatePrompt}
            onChange={(e) => setCandidatePrompt(e.target.value)}
            dir="rtl"
            rows={14}
            className="w-full rounded-2xl border border-[var(--stroke)] bg-white p-4 font-mono text-xs leading-6 outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold">פרומפט סוכן מעסיקים</h2>
            <span className="max-w-xl text-xs leading-5 text-[var(--muted)]">
              {PLACEHOLDER_HELP}
            </span>
          </div>
          <textarea
            value={employerPrompt}
            onChange={(e) => setEmployerPrompt(e.target.value)}
            dir="rtl"
            rows={14}
            className="w-full rounded-2xl border border-[var(--stroke)] bg-white p-4 font-mono text-xs leading-6 outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void savePrompts()}
            className="rounded-xl bg-[var(--hero)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "שומר…" : "שמירת פרומפטים (לייב)"}
          </button>
          <button
            type="button"
            disabled={resetting}
            onClick={() => void resetPrompts()}
            className="rounded-xl border border-[var(--stroke)] bg-white px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {resetting ? "מאפס…" : "איפוס לברירת מחדל"}
          </button>
          {saved ? <span className="text-sm text-[var(--accent)]">נשמר — פעיל מההודעה הבאה</span> : null}
          {prompts.updatedAt ? (
            <span className="text-xs text-[var(--muted)]">
              עודכן לאחרונה: {new Date(prompts.updatedAt).toLocaleString("he-IL")}
              {prompts.updatedBy ? ` · ${prompts.updatedBy}` : ""}
            </span>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="premium-panel rounded-2xl p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-[var(--hero)]">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}
