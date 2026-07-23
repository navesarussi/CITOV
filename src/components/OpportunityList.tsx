"use client";

import { useTranslation } from "@/components/LocaleProvider";

type Job = {
  matchId: string;
  score: number;
  reason: string;
  employerName: string;
  card?: {
    title: string;
    field: string;
    location: string;
    salaryRange: string;
    personalityFit: string;
    interviewSlots: string[];
    summary: string;
  };
};

export function OpportunityList(props: { jobs: Job[] }) {
  const { t, fmt } = useTranslation();

  if (props.jobs.length === 0) {
    return (
      <div className="panel rounded-[var(--panel-radius)] border-dashed p-10 text-center text-sm text-[var(--muted)]">
        {t.jobs.empty}
      </div>
    );
  }

  return (
    <div className="tab-fade space-y-3">
      {props.jobs.map((job) => (
        <article
          key={job.matchId}
          className="panel rounded-[var(--panel-radius)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[var(--hero)]">
                {job.card?.title || t.jobs.defaultTitle}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {job.employerName}
                {job.card?.field ? ` · ${job.card.field}` : ""}
                {job.card?.location ? ` · ${job.card.location}` : ""}
              </p>
            </div>
            <span className="rounded-full bg-[var(--bubble)] px-2.5 py-1 text-xs font-medium text-[var(--accent-strong)]">
              {t.jobs.approved}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink)]">{job.reason}</p>
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
        </article>
      ))}
    </div>
  );
}
