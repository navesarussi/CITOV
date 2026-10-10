"use client";

import { useState } from "react";
import { FlexibilitySlider } from "@/components/FlexibilitySlider";
import { useTranslation } from "@/components/LocaleProvider";
import { candidateMiniCardLines } from "@/domain/candidate-mini-card";
import { candidateRows, knowledgePercent } from "@/domain/card-progress";
import { emptyCandidateCard, type CandidateCard } from "@/domain/types";

function clampFlex(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(10, Math.round(value)));
}

/** Candidate self-presentation: knowledge % + expandable safe mini-card + flexibility. */
export function CandidateProfileStrip(props: {
  userId: string;
  card: CandidateCard | null | undefined;
  onFlexibilityChange?: (value: number) => void;
}) {
  const { t, fmt } = useTranslation();
  const card = props.card ?? emptyCandidateCard();
  const [open, setOpen] = useState(false);
  const flexFromCard = clampFlex(card.flexibility);
  const [flex, setFlex] = useState(flexFromCard);
  const [prevFlexFromCard, setPrevFlexFromCard] = useState(flexFromCard);
  if (flexFromCard !== prevFlexFromCard) {
    setPrevFlexFromCard(flexFromCard);
    setFlex(flexFromCard);
  }

  const labels = t.cardFields.candidate as Record<string, string>;
  const knowledge = knowledgePercent(candidateRows(card, labels));
  const miniLines = candidateMiniCardLines(card, labels);

  function onFlex(value: number) {
    setFlex(value);
    props.onFlexibilityChange?.(value);
  }

  return (
    <section
      className={`employee-profile-card panel-elevated${open ? " employee-profile-card--open" : ""}`}
    >
      <button
        type="button"
        className="employee-profile-card__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="employee-profile-card__toggle-copy">
          <span className="employee-profile-card__toggle-title">
            <span className="employee-profile-card__toggle-label">{t.profile.yourCard}</span>
            <span className="employee-profile-card__toggle-percent">
              {fmt(t.profile.knowledgePercent, { percent: String(knowledge) })}
            </span>
          </span>
          <span className="employee-profile-card__toggle-meta">{t.profile.miniCardHint}</span>
        </span>
        <span className="employee-profile-card__expand" aria-hidden>
          <svg className="employee-profile-card__expand-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
          <span className="employee-profile-card__expand-label">
            {open ? t.profile.hideDetails : t.profile.showDetails}
          </span>
        </span>
      </button>

      <div
        className="knowledge-bar"
        style={{ ["--knowledge-pct" as string]: `${knowledge}%` }}
        role="meter"
        aria-valuenow={knowledge}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.profile.knowledge}
      >
        <div className="knowledge-bar__fill" />
      </div>

      {open ? (
        <>
          {miniLines.length > 0 ? (
            <dl className="employee-profile-card__fields space-y-2">
              {miniLines.map((line) => (
                <div key={line.key} className="employee-profile-card__field">
                  <dt>{line.label}</dt>
                  <dd>{line.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mx-4 mb-3 text-xs text-[var(--muted)]">{t.profile.miniCardEmpty}</p>
          )}
          <FlexibilitySlider userId={props.userId} value={flex} onChange={onFlex} />
        </>
      ) : null}
    </section>
  );
}
