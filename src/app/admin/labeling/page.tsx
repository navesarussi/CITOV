"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelingPair } from "@/application/admin-labeling";
import { LabelingPairView } from "@/components/admin/LabelingPairView";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/Button";
import type { RelevanceLabel } from "@/domain/matching-eval/types";

type Metrics = {
  totalLabels: number;
  ready: boolean;
  minRequired?: number;
  message?: string;
  labeledPairs?: number;
  labelCounts?: { good: number; acceptable: number; bad: number };
  agreementRate?: number;
  queueThreshold?: number;
  suggestedThreshold?: number | null;
  disagreements?: {
    jobId: string;
    candidateId: string;
    humanLabel: string;
    systemQueued: boolean;
    hybridScore: number;
  }[];
  matchers?: {
    id: string;
    threshold: number;
    precisionAt5: number;
    recallAt5: number;
    goodMissed: number;
    badQueued: number;
  }[];
  thresholdSweep?: { threshold: number; precisionAt5: number; recallAt5: number; badQueued: number }[];
};

export default function AdminLabelingPage() {
  const [pair, setPair] = useState<LabelingPair | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/labeling");
      const data = (await res.json()) as { error?: string; pair?: LabelingPair | null; metrics?: Metrics };
      if (!res.ok || data.error) throw new Error(data.error ?? "failed");
      setPair(data.pair ?? null);
      setMetrics(data.metrics ?? null);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(label: RelevanceLabel) {
    if (!pair || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/labeling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: pair.jobId,
          candidateId: pair.candidateId,
          label,
          note,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        pair?: LabelingPair | null;
        metrics?: Metrics;
      };
      if (!res.ok || data.error) throw new Error(data.error ?? "failed");
      setPair(data.pair ?? null);
      setMetrics(data.metrics ?? null);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function applySuggestedThreshold() {
    const t = metrics?.suggestedThreshold;
    if (t == null || submitting) return;
    if (!confirm(`להחיל סף ${t.toFixed(2)} ב-admin_settings? (מדגם קטן — לבדוק שוב אחרי עוד תיוגים)`)) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/labeling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "applyThreshold", threshold: t }),
      });
      const data = (await res.json()) as { error?: string; metrics?: Metrics };
      if (!res.ok || data.error) throw new Error(data.error ?? "failed");
      setMetrics(data.metrics ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell title="תיוג התאמות" subtitle="Holdout + זוגות עם פער rule/hybrid · מטריקות חיות">
      <div className="space-y-4">
        {metrics ? (
          <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--hero)]">לוח מצב — איך התיוג עוזר</h2>
            <p className="text-sm text-[var(--muted)]">
              סה״כ תיוגים: <strong>{metrics.totalLabels}</strong>
              {metrics.labelCounts ? (
                <>
                  {" "}
                  (מתאים {metrics.labelCounts.good} · סביר {metrics.labelCounts.acceptable} · לא{" "}
                  {metrics.labelCounts.bad})
                </>
              ) : null}
              {!metrics.ready ? (
                <span> · {metrics.message}</span>
              ) : (
                <span>
                  {" "}
                  · הסכמה מערכת↔אדם: {((metrics.agreementRate ?? 0) * 100).toFixed(0)}% · סף נוכחי{" "}
                  {(metrics.queueThreshold ?? 0.6).toFixed(2)}
                </span>
              )}
            </p>
            {metrics.ready && metrics.matchers ? (
              <div className="text-sm space-y-1">
                {metrics.matchers.map((m) => (
                  <p key={m.id}>
                    <strong>{m.id}</strong> (t={m.threshold.toFixed(2)}): P@5{" "}
                    {(m.precisionAt5 * 100).toFixed(0)}% · R@5 {(m.recallAt5 * 100).toFixed(0)}% · good
                    missed {m.goodMissed} · bad queued {m.badQueued}
                  </p>
                ))}
              </div>
            ) : null}
            {metrics.suggestedThreshold != null ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>
                  סף מוצע (מדגם {metrics.labeledPairs} זוגות):{" "}
                  <strong>{metrics.suggestedThreshold.toFixed(2)}</strong> — heuristic על התיוגים הנוכחיים
                  בלבד
                </span>
                <Button variant="secondary" disabled={submitting} onClick={() => void applySuggestedThreshold()}>
                  החלת סף מוצע
                </Button>
              </div>
            ) : null}
            {(metrics.disagreements?.length ?? 0) > 0 ? (
              <div>
                <p className="text-xs font-semibold text-[var(--warn)]">אי-הסכמות (מערכת vs אדם)</p>
                <ul className="mt-1 max-h-32 overflow-y-auto text-xs space-y-1">
                  {metrics.disagreements!.map((d) => (
                    <li key={`${d.jobId}:${d.candidateId}`}>
                      {d.jobId}/{d.candidateId}: אדם={d.humanLabel} · מערכת=
                      {d.systemQueued ? "בתור" : "לא בתור"} · hybrid {(d.hybridScore * 100).toFixed(0)}%
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--muted)]">טוען…</p>
        ) : !pair ? (
          <p className="text-sm text-[var(--muted)]">אין זוגות נותרים לתיוג 🎉</p>
        ) : (
          <LabelingPairView pair={pair} />
        )}

        {pair ? (
          <>
            <textarea
              className="w-full rounded-xl border border-[var(--stroke)] p-3 text-sm"
              rows={3}
              placeholder="הערה (אופציונלי)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={submitting} onClick={() => void submit("good")}>
                מתאים
              </Button>
              <Button disabled={submitting} variant="secondary" onClick={() => void submit("acceptable")}>
                סביר
              </Button>
              <Button disabled={submitting} variant="secondary" onClick={() => void submit("bad")}>
                לא מתאים
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}
