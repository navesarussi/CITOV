"use client";

import { useCallback, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import type { MonitoringDashboard } from "@/application/monitoring-dashboard";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/Button";
import { useAdminCache } from "@/components/admin/AdminCacheProvider";
import { useTranslation } from "@/components/LocaleProvider";

export default function AdminMonitoringPage() {
  const { t } = useTranslation();
  const cache = useAdminCache();
  const [data, setData] = useState<MonitoringDashboard | null>(
    () => cache.getCached<MonitoringDashboard>("/api/admin/monitoring", 30_000),
  );
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/monitoring");
      const json = (await res.json()) as { error?: string; dashboard?: MonitoringDashboard };
      if (!res.ok || !json.dashboard) throw new Error(json.error ?? "failed");
      cache.setCached("/api/admin/monitoring", json.dashboard);
      setData(json.dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useDeferredEffect(() => {
    if (!data) void load();
  }, [data, load]);

  async function resolveIssue(fingerprint: string, status: "open" | "resolved") {
    const res = await fetch("/api/admin/monitoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setIssueStatus", fingerprint, status }),
    });
    const json = (await res.json()) as { dashboard?: MonitoringDashboard };
    if (json.dashboard) setData(json.dashboard);
  }

  const b = data?.aiBudget;

  return (
    <AdminShell title={t.adminPages.monitoringTitle} subtitle={t.adminPages.monitoringSubtitle}>
      {error ? (
        <p className="mb-3 rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
      ) : null}
      {loading && !data ? <p className="text-sm text-[var(--muted)]">טוען ניטור…</p> : null}
      {data ? (
        <div className="space-y-5">
          {(data.observability.sentry || data.observability.langfuse) && (
            <section className="panel rounded-[var(--panel-radius)] p-5">
              <h2 className="text-base font-semibold text-[var(--hero)]">Sentry &amp; Langfuse</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                שגיאות production, traces של קריאות Gemini, ועלויות — לפי env ב-Vercel.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.observability.sentry ? (
                  <a
                    href={data.observability.sentry}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[var(--stroke)] bg-white/90 px-3 py-2 text-sm font-medium text-[var(--hero)] underline-offset-2 hover:underline"
                  >
                    Open Sentry
                  </a>
                ) : null}
                {data.observability.langfuse ? (
                  <a
                    href={data.observability.langfuse}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[var(--stroke)] bg-white/90 px-3 py-2 text-sm font-medium text-[var(--hero)] underline-offset-2 hover:underline"
                  >
                    Langfuse
                  </a>
                ) : null}
              </div>
            </section>
          )}
          <section className="panel rounded-[var(--panel-radius)] p-5">
            <h2 className="text-base font-semibold text-[var(--hero)]">תקציב AI</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="היום ($)" value={`${b?.dailySpendUsd.toFixed(2) ?? "0"} / ${b?.dailyCapUsd ? b.dailyCapUsd.toFixed(2) : "∞"}`} />
              <Stat label="החודש ($)" value={`${b?.monthlySpendUsd.toFixed(2) ?? "0"} / ${b?.monthlyCapUsd ? b.monthlyCapUsd.toFixed(2) : "∞"}`} />
              <Stat label="אזהרה 80%" value={b?.warn ? "פעילה" : "לא"} />
              <Stat label="חסימת Gemini" value={b?.blocked ? "פעילה" : "לא"} />
            </div>
          </section>

          <section className="panel rounded-[var(--panel-radius)] p-5">
            <h2 className="text-base font-semibold text-[var(--hero)]">בקשות איטיות (p50/p95, 24ש)</h2>
            {data.latency.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">אין נתונים עדיין.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {data.latency.map((row) => (
                  <li key={row.route} className="flex flex-wrap justify-between gap-2 rounded-lg border border-[var(--stroke)] px-3 py-2">
                    <span className="font-mono text-xs">{row.route}</span>
                    <span className="text-[var(--muted)]">
                      p50 {row.p50}ms · p95 {row.p95}ms · n={row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel rounded-[var(--panel-radius)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[var(--hero)]">קבוצות תקלות</h2>
              <Button variant="secondary" className="min-h-9" onClick={() => void load()}>
                רענון
              </Button>
            </div>
            <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
              {data.issues.map((issue) => (
                <li key={issue.fingerprint} className="rounded-xl border border-[var(--stroke)] bg-white/90 p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--hero)]">
                        {issue.kind} · {issue.severity} · ×{issue.count}
                      </p>
                      <p className="mt-1 font-mono text-xs text-[var(--muted)]">{issue.route ?? "—"}</p>
                      <p className="mt-2 text-[var(--ink)]">{issue.message}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        ראשון {new Date(issue.firstSeen).toLocaleString("he-IL")} · אחרון{" "}
                        {new Date(issue.lastSeen).toLocaleString("he-IL")}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="min-h-8 text-xs"
                      onClick={() =>
                        void resolveIssue(
                          issue.fingerprint,
                          issue.issueStatus === "open" ? "resolved" : "open",
                        )
                      }
                    >
                      {issue.issueStatus === "open" ? "סמן נפתר" : "פתח מחדש"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel rounded-[var(--panel-radius)] p-5">
            <h2 className="text-base font-semibold text-[var(--hero)]">הערכת חילוץ (golden set)</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {data.extractionEval.cases} מקרים ({data.extractionEval.cvCases} קו״ח ·{" "}
              {data.extractionEval.jobCases} משרות) · עודכן{" "}
              {new Date(data.extractionEval.evaluatedAt).toLocaleString("he-IL")}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Stat
                label="דיוק (אחרי הקשחה)"
                value={`${(data.extractionEval.precision * 100).toFixed(1)}%`}
              />
              <Stat
                label="Recall (אחרי)"
                value={`${(data.extractionEval.recall * 100).toFixed(1)}%`}
              />
              <Stat
                label="Hallucination rate (אחרי)"
                value={`${(data.extractionEval.hallucinationRate * 100).toFixed(1)}%`}
              />
              <Stat
                label="דיוק (לפני — baseline)"
                value={`${(data.extractionEval.baselinePrecision * 100).toFixed(1)}%`}
              />
              <Stat
                label="Recall (לפני)"
                value={`${(data.extractionEval.baselineRecall * 100).toFixed(1)}%`}
              />
              <Stat
                label="Hallucination (לפני)"
                value={`${(data.extractionEval.baselineHallucinationRate * 100).toFixed(1)}%`}
              />
            </div>
          </section>

          <section className="panel rounded-[var(--panel-radius)] p-5">
            <h2 className="text-base font-semibold text-[var(--hero)]">E2E אחרון</h2>
            {data.e2e ? (
              <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--chip)] p-3 text-xs">
                {JSON.stringify(data.e2e, null, 2)}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">טרם דווחה ריצה.</p>
            )}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--stroke)] bg-white/80 p-3">
      <p className="text-xs text-[var(--muted)]">{props.label}</p>
      <p className="mt-1 text-lg font-bold text-[var(--hero)]">{props.value}</p>
    </div>
  );
}
