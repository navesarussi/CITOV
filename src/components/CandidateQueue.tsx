"use client";

import { useState } from "react";

type Item = {
  matchId: string;
  score: number;
  reason: string;
  name: string;
  card?: {
    summary: string;
    desiredRole: string;
    field: string;
    location: string;
    personality: string;
    flexibility: number;
    skills: string[];
  };
};

export function CandidateQueue(props: {
  employerId: string;
  items: Item[];
  onChanged: () => void;
}) {
  const [questionById, setQuestionById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(matchId: string, action: "approve" | "reject" | "ask") {
    setBusyId(matchId);
    try {
      await fetch("/api/employer/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employerId: props.employerId,
          matchId,
          action,
          question: questionById[matchId],
        }),
      });
      props.onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (props.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--stroke)] p-8 text-center text-sm text-[var(--muted)]">
        עדיין אין מועמדים מדורגים. מלאו את כרטיס המשרה בשיחה — והמערכת תביא התאמות.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {props.items.map((item) => (
        <article
          key={item.matchId}
          className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[var(--ink)]">{item.name}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {item.card?.desiredRole || "תפקיד לא צוין"}
                {item.card?.field ? ` · ${item.card.field}` : ""}
                {item.card?.location ? ` · ${item.card.location}` : ""}
              </p>
            </div>
            <span className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs font-medium text-[var(--ink)]">
              {Math.round(item.score * 100)}%
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink)]">{item.reason}</p>
          {item.card?.personality ? (
            <p className="mt-2 text-xs text-[var(--muted)]">אופי: {item.card.personality}</p>
          ) : null}
          <p className="mt-1 text-xs text-[var(--muted)]">
            גמישות {item.card?.flexibility ?? "—"}/10
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyId === item.matchId}
              onClick={() => void act(item.matchId, "approve")}
              className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm text-white"
            >
              מתאים
            </button>
            <button
              type="button"
              disabled={busyId === item.matchId}
              onClick={() => void act(item.matchId, "reject")}
              className="rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm"
            >
              לא מתאים
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={questionById[item.matchId] ?? ""}
              onChange={(e) =>
                setQuestionById((s) => ({ ...s, [item.matchId]: e.target.value }))
              }
              placeholder="שאלה לתחום (תוקפץ לכל המועמדים בתחום)"
              className="flex-1 rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              disabled={busyId === item.matchId}
              onClick={() => void act(item.matchId, "ask")}
              className="rounded-xl bg-[var(--ink)] px-3 py-2 text-sm text-white"
            >
              שאל
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
