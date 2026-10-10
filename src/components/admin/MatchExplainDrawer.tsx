"use client";

import { useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import type { MatchScoreBreakdown } from "@/domain/match-score-breakdown";
import type { CandidateCard, JobCard } from "@/domain/types";
import type { WaterfallStepHe } from "@/application/match-explain-waterfall";

type ExplainPayload = {
  breakdown: MatchScoreBreakdown;
  waterfall: WaterfallStepHe[];
  candidateCard: CandidateCard;
  jobCard: JobCard;
  match: { score: number; reason: string; status: string };
};

export function MatchExplainDrawer(props: {
  matchId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<ExplainPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useDeferredEffect(() => {
    if (!props.matchId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    void fetch(`/api/admin/match-explain?matchId=${encodeURIComponent(props.matchId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
          setData(null);
          return;
        }
        setData(json as ExplainPayload);
      })
      .catch(() => setError("שגיאת רשת"))
      .finally(() => setLoading(false));
  }, [props.matchId]);

  if (!props.matchId) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/40" role="dialog">
      <div className="flex h-full w-full max-w-none flex-col bg-[var(--surface)] shadow-xl sm:max-w-xl">
        <header className="flex items-center justify-between border-b border-[var(--stroke)] px-4 py-3">
          <h2 className="text-lg font-semibold">למה ההתאמה הזו?</h2>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-xl border border-[var(--stroke)] px-3 text-sm text-[var(--muted)] hover:bg-[var(--chip)]"
            onClick={props.onClose}
          >
            סגירה
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? <p className="text-sm text-[var(--muted)]">טוען…</p> : null}
          {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
          {data ? (
            <div className="space-y-6">
              <p className="text-sm text-[var(--muted)]">
                {data.match.status} · ציון {(data.match.score * 100).toFixed(0)}% ·{" "}
                {data.breakdown.effectiveMode}
                {data.breakdown.degraded ? " · rule fallback" : ""}
              </p>
              <section>
                <h3 className="mb-2 text-sm font-semibold">מפל ציון</h3>
                <ul className="space-y-2">
                  {data.waterfall.map((step) => (
                    <li key={step.key} className="rounded-lg bg-[var(--chip)] px-3 py-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span>{step.labelHe}</span>
                        <span className="font-mono text-xs">
                          {(step.value * 100).toFixed(1)}%
                          {step.delta !== 0 && step.key !== "threshold" ? (
                            <span className="ms-2 text-[var(--muted)]">
                              ({step.delta >= 0 ? "+" : ""}
                              {(step.delta * 100).toFixed(1)})
                            </span>
                          ) : null}
                        </span>
                      </div>
                      {step.key !== "threshold" ? (
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--stroke)]">
                          <div
                            className="h-full bg-[var(--accent)]"
                            style={{ width: `${Math.min(100, step.value * 100)}%` }}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="grid gap-3 sm:grid-cols-2">
                <CardPreview title="מועמד/ת" card={data.candidateCard} />
                <CardPreview title="משרה" card={data.jobCard} />
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CardPreview(props: { title: string; card: CandidateCard | JobCard }) {
  const c = props.card as CandidateCard & JobCard;
  return (
    <div className="rounded-xl border border-[var(--stroke)] p-3 text-xs">
      <p className="mb-2 font-semibold">{props.title}</p>
      <p>{c.desiredRole || c.title}</p>
      <p className="text-[var(--muted)]">
        {c.field} · {c.location}
      </p>
    </div>
  );
}

export function MatchExplainButton(props: { matchId: string; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
      onClick={() => props.onOpen(props.matchId)}
    >
      למה ההתאמה הזו?
    </button>
  );
}
