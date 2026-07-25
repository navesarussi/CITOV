"use client";

import { useTranslation } from "@/components/LocaleProvider";
import { candidateCardViewLines } from "@/domain/candidate-card-views";
import { emptyCandidateCard, type CandidateCard } from "@/domain/types";

/** Admin / internal full card — every filled field including sensitive ones. */
export function FullCandidateCard(props: {
  name?: string;
  card: CandidateCard | null | undefined;
  pendingCount?: number;
}) {
  const { t, fmt } = useTranslation();
  const card = props.card ?? emptyCandidateCard();
  const labels = t.cardFields.candidate as Record<string, string>;
  const lines = candidateCardViewLines(card, "full", labels);

  return (
    <section className="panel-elevated flex max-h-[70vh] flex-col p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {t.candidates.fullCardBadge}
      </p>
      <h2 className="mt-1 text-sm font-bold text-[var(--hero)]">
        {props.name ? fmt(t.candidates.fullCardTitle, { name: props.name }) : t.profile.yourCard}
      </h2>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{t.profile.autoFillHint}</p>

      {props.pendingCount && props.pendingCount > 0 ? (
        <div className="mt-3 rounded-xl bg-[var(--warn-bg)] p-3 text-xs text-[var(--warn)]">
          {fmt(t.profile.pendingQuestions, { count: props.pendingCount })}
        </div>
      ) : null}

      <dl className="mt-3 space-y-2 overflow-y-auto pe-1 text-sm">
        {lines.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">{t.profile.emptyValue}</p>
        ) : (
          lines.map((row) => (
            <div key={row.key}>
              <dt className="text-xs text-[var(--muted)]">{row.label}</dt>
              <dd className="text-[var(--ink)]">{row.value || t.profile.emptyValue}</dd>
            </div>
          ))
        )}
      </dl>
    </section>
  );
}
