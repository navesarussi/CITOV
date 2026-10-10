"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/Button";
import type { RelevanceLabel } from "@/domain/matching-eval/types";

type Pair = {
  pairId: string;
  jobId: string;
  candidateId: string;
  jobTitle: string;
  jobSummary: string;
  candidateTitle: string;
  candidateSummary: string;
  ruleScore: number;
  hybridScore: number;
  bucket: string;
};

type Metrics = {
  totalLabels: number;
  ready: boolean;
  message?: string;
  labeledPairs?: number;
  matchers?: {
    id: string;
    threshold: number;
    precisionAt5: number;
    recallAt5: number;
    ndcgAt5: number;
    goodMissed: number;
    badQueued: number;
  }[];
};

export default function AdminLabelingPage() {
  const [pair, setPair] = useState<Pair | null>(null);
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
      const data = (await res.json()) as {
        error?: string;
        pair?: Pair | null;
        metrics?: Metrics;
      };
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
        pair?: Pair | null;
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

  return (
    <AdminShell title="תיוג התאמות" subtitle="Holdout + זוגות עם פער rule/hybrid · מטריקות חיות">
      <div className="space-y-4">
        {metrics ? (
          <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-semibold text-[var(--hero)]">לוח מצב</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              סה״כ תיוגים: <strong>{metrics.totalLabels}</strong>
              {metrics.ready && metrics.matchers
                ? metrics.matchers.map((m) => (
                    <span key={m.id} className="mr-3 block sm:inline">
                      {" "}
                      · {m.id} (t={m.threshold.toFixed(2)}): P@5{" "}
                      {(m.precisionAt5 * 100).toFixed(0)}% R@5{" "}
                      {(m.recallAt5 * 100).toFixed(0)}% good miss {m.goodMissed} bad Q{" "}
                      {m.badQueued}
                    </span>
                  ))
                : ` · ${metrics.message ?? ""}`}
            </p>
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
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-[var(--stroke)] bg-white/80 p-4 shadow-sm">
              <p className="text-xs text-[var(--muted)]">משרה · {pair.jobId}</p>
              <h3 className="text-lg font-bold text-[var(--hero)]">{pair.jobTitle}</h3>
              <p className="mt-2 text-sm">{pair.jobSummary}</p>
            </article>
            <article className="rounded-2xl border border-[var(--stroke)] bg-white/80 p-4 shadow-sm">
              <p className="text-xs text-[var(--muted)]">מועמד/ת · {pair.candidateId}</p>
              <h3 className="text-lg font-bold text-[var(--hero)]">{pair.candidateTitle}</h3>
              <p className="mt-2 text-sm">{pair.candidateSummary}</p>
            </article>
          </section>
        )}

        {pair ? (
          <>
            <p className="text-xs text-[var(--muted)]">
              rule={pair.ruleScore.toFixed(2)} hybrid={pair.hybridScore.toFixed(2)} · {pair.bucket}
            </p>
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
