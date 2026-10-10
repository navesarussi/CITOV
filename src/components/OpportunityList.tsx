"use client";

import { useState } from "react";
import { useTranslation } from "@/components/LocaleProvider";
import { readStoredUser } from "@/lib/client-session";

type Job = {
  matchId: string;
  score: number;
  reason: string;
  whyHe?: string[];
  employerName: string;
  candidateConsentAt?: string | null;
  card?: {
    title: string;
    field: string;
    location: string;
    salaryRange: string;
    personalityFit: string;
    interviewSlots: string[];
    summary: string;
    contactName?: string;
    contactPhone?: string;
  };
};

export function OpportunityList(props: { jobs: Job[] }) {
  const { t, fmt } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function consentToReveal(matchId: string) {
    const user = readStoredUser();
    if (!user?.id) return;
    setBusyId(matchId);
    try {
      await fetch("/api/opportunities/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, matchId }),
      });
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  }

  async function markNotRelevant(matchId: string) {
    const user = readStoredUser();
    if (!user?.id) return;
    setBusyId(matchId);
    try {
      await fetch("/api/match-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, matchId, action: "not_relevant" }),
      });
    } finally {
      setBusyId(null);
    }
  }

  if (props.jobs.length === 0) {
    return (
      <div className="empty-state panel-elevated border-dashed p-12 text-center">
        <p className="text-sm leading-6 text-[var(--muted)]">{t.jobs.empty}</p>
      </div>
    );
  }

  return (
    <div className="tab-fade space-y-4">
      {props.jobs.map((job) => (
        <article
          key={job.matchId}
          className="panel-elevated group p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[var(--hero)]">
                {job.card?.title || t.jobs.defaultTitle}
              </h3>
              <p className="mt-1.5 text-sm text-[var(--muted)]">
                {job.employerName}
                {job.card?.field ? ` · ${job.card.field}` : ""}
                {job.card?.location ? ` · ${job.card.location}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-strong)]">
              {t.jobs.approved}
            </span>
          </div>
          {job.whyHe?.length ? (
            <div className="mt-4 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                למה הוצע לך
              </p>
              <ul className="list-inside list-disc text-sm leading-7 text-[var(--ink)]">
                {job.whyHe.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-[var(--ink)]">{job.reason}</p>
          )}
          <button
            type="button"
            disabled={busyId === job.matchId}
            className="mt-3 text-xs font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--warn)] hover:underline disabled:opacity-50"
            onClick={() => void markNotRelevant(job.matchId)}
          >
            לא רלוונטי
          </button>
          {job.card?.salaryRange ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {fmt(t.jobs.salary, { value: job.card.salaryRange })}
            </p>
          ) : null}
          {job.card?.interviewSlots?.length ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {fmt(t.jobs.interviewSlots, { value: job.card.interviewSlots.join(" · ") })}
            </p>
          ) : null}

          <div className="mt-4 rounded-xl border border-[var(--stroke)] bg-[var(--chip)] px-4 py-3">
            {job.candidateConsentAt ? (
              <p className="text-sm leading-6 text-[var(--ink)]">{t.jobs.consentDone}</p>
            ) : (
              <>
                <p className="text-xs leading-5 text-[var(--muted)]">{t.jobs.contactPending}</p>
                <button
                  type="button"
                  disabled={busyId === job.matchId}
                  className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={() => void consentToReveal(job.matchId)}
                >
                  {t.jobs.consentCta}
                </button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
