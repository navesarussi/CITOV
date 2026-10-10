"use client";

import { useCallback, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/Button";
import type { SandboxRunReport } from "@/application/test-sandbox/run-report";
import { useTranslation } from "@/components/LocaleProvider";

type ReportPayload = SandboxRunReport & { recordedAt?: string };

export default function SandboxReportPage() {
  const { t } = useTranslation();
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sandbox-run-report");
      const data = (await res.json()) as { report?: ReportPayload | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      setReport(data.report ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useDeferredEffect(() => {
    void load();
  }, [load]);

  async function rerun() {
    if (running || !confirm("להריץ מחדש את מערך הבדיקה? (עשוי לקחת דקות)")) return;
    setRunning(true);
    setError("");
    try {
      const seedRes = await fetch("/api/admin/sandbox-run-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const seedData = (await seedRes.json()) as { report?: ReportPayload; error?: string };
      if (!seedRes.ok) throw new Error(seedData.error ?? "ההרצה נכשלה");
      setReport(seedData.report ?? null);

      let offset = 0;
      let done = false;
      while (!done) {
        const jRes = await fetch("/api/admin/sandbox-run-report", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "judgeChunk", offset, reset: offset === 0 }),
        });
        const jData = (await jRes.json()) as {
          judge?: { done: boolean; judgedCount: number; totalQueued: number };
          error?: string;
        };
        if (!jRes.ok) throw new Error(jData.error ?? "שיפוט AI נכשל");
        done = jData.judge?.done ?? true;
        offset = jData.judge?.judgedCount ?? offset;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const ev = report?.fullEval;
  const rb = report?.rebuild;

  return (
    <AdminShell title={t.adminPages.sandboxTitle} subtitle={t.adminPages.sandboxSubtitle}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          רענון
        </Button>
        <Button onClick={() => void rerun()} disabled={running}>
          {running ? "מריץ…" : "הרץ seed + הערכה"}
        </Button>
      </div>
      {error ? (
        <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
      ) : null}
      {loading && !report ? <p className="text-sm text-[var(--muted)]">טוען…</p> : null}
      {!loading && !report ? (
        <p className="text-sm text-[var(--muted)]">אין דוח. הריצו npm run seed:test-sandbox או כפתור למעלה.</p>
      ) : null}
      {report && ev && rb ? (
        <div className="space-y-6 text-sm">
          <p className="text-[var(--muted)]">
            {report.recordedAt
              ? new Date(report.recordedAt).toLocaleString("he-IL")
              : new Date(report.generatedAt).toLocaleString("he-IL")}{" "}
            · dataset {report.datasetId}
          </p>
          <section className="panel grid gap-3 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="זוגות (150×150)" value={String(ev.pairCount)} />
            <Stat label="בתור (מעל סף)" value={`${ev.queuedCount} / סף ${(ev.threshold * 100).toFixed(0)}%`} />
            <Stat label="מעבר לכללים בלבד" value={String(ev.degradedToRuleCount)} />
            <Stat label="אי-הסכמה קלאסי↔חכם" value={String(ev.ruleHybridDisagreementCount)} />
            <Stat label="זמן בנייה מחדש" value={`${rb.durationMs} ms`} />
            <Stat label="מוגבל בבנייה" value={String(rb.degradedToRule)} />
            <Stat label="וקטורי ייצוג" value={String(report.embedding.segmentVectorsLoaded)} />
            <Stat
              label="AI (הרצה)"
              value={`${report.embedding.aiUsageCallsDuringRun} קריאות · $${report.embedding.aiUsageCostUsdDuringRun.toFixed(4)}`}
            />
          </section>
          <section>
            <h2 className="mb-2 font-semibold">התפלגות ציונים (התאמה חכמה)</h2>
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {ev.scoreHistogram.map((h) => (
                <li key={h.bucket} className="flex justify-between rounded-lg bg-[var(--chip)] px-3 py-1.5">
                  <span>{h.bucket}</span>
                  <span className="font-mono">{h.count}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-2 font-semibold">זוגות חשודים (top 40)</h2>
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {ev.suspicious.map((s) => (
                <li key={`${s.jobId}:${s.candidateId}`} className="rounded-lg border border-[var(--stroke)] p-2">
                  <span className="font-mono text-xs">
                    {s.jobId} ↔ {s.candidateId}
                  </span>
                  <span className="ms-2 text-[var(--muted)]">{(s.score * 100).toFixed(0)}%</span>
                  <p className="mt-1 text-xs">{s.reasonHe}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted)]">{props.label}</p>
      <p className="text-lg font-semibold">{props.value}</p>
    </div>
  );
}
