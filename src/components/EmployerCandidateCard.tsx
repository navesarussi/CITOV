"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/components/LocaleProvider";
import { candidateCardViewLines } from "@/domain/candidate-card-views";
import type { CandidateCard } from "@/domain/types";

/** Employer-facing presentation of a matched candidate (not full/admin, not self-view). */
export function EmployerCandidateCard(props: {
  name: string;
  score: number;
  reason: string;
  card?: Partial<CandidateCard> | null;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  const { t, fmt } = useTranslation();
  const labels = t.cardFields.candidate as Record<string, string>;
  const lines = props.card
    ? candidateCardViewLines(props.card as CandidateCard, "employer", labels)
    : [];
  const headline = lines.find((l) => l.key === "summary" || l.key === "narrative");
  const roleLine = [props.card?.desiredRole, props.card?.field, props.card?.location]
    .filter(Boolean)
    .join(" · ");
  const detailLines = lines.filter(
    (l) => !["summary", "narrative", "desiredRole", "field", "location"].includes(l.key),
  );

  return (
    <article className="panel-elevated p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t.candidates.employerCardBadge}
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--hero)]">{props.name}</h3>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            {roleLine || t.candidates.roleNotSpecified}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-strong)]">
          {Math.round(props.score * 100)}%
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--ink)]">{props.reason}</p>

      {headline ? (
        <p className="mt-3 text-sm leading-6 text-[var(--ink)]/90">{headline.value}</p>
      ) : null}

      {detailLines.length > 0 ? (
        <dl className="mt-4 grid gap-2 border-t border-[var(--stroke)] pt-3 sm:grid-cols-2">
          {detailLines.slice(0, 10).map((line) => (
            <div key={line.key}>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {line.label}
              </dt>
              <dd className="mt-0.5 text-xs leading-5 text-[var(--ink)]">{line.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {props.card?.flexibility != null ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          {fmt(t.candidates.flexibility, { value: props.card.flexibility })}
        </p>
      ) : null}

      {props.actions ? <div className="mt-4 flex flex-wrap gap-2">{props.actions}</div> : null}
      {props.footer ? <div className="mt-3">{props.footer}</div> : null}
    </article>
  );
}
