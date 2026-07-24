"use client";

import { useState } from "react";
import { FlexibilitySlider } from "@/components/FlexibilitySlider";
import { useTranslation } from "@/components/LocaleProvider";
import { candidateMiniCardLines } from "@/domain/candidate-mini-card";
import { candidateRows, knowledgePercent } from "@/domain/card-progress";
import { emptyCandidateCard, type CandidateCard } from "@/domain/types";

export function CandidateProfileStrip(props: {
  card: CandidateCard | null | undefined;
  userId: string;
  onFlexibilityChange: (value: number) => void;
}) {
  const { t, fmt } = useTranslation();
  const [open, setOpen] = useState(false);
  const card = props.card ?? emptyCandidateCard();
  const labels = t.cardFields.candidate as Record<string, string>;
  const miniLines = candidateMiniCardLines(card, labels);
  const percent = knowledgePercent(candidateRows(card, labels));

  return (
    <div className={`employee-profile-card ${open ? "employee-profile-card--open" : ""}`}>
      <button
        type="button"
        className="employee-profile-card__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="employee-profile-card__toggle-copy">
          <span className="employee-profile-card__toggle-title">{t.profile.yourCard}</span>
          <span className="employee-profile-card__toggle-meta">
            {fmt(t.profile.knowledgePercent, { percent: String(percent) })} · {t.profile.knowledge}
          </span>
        </span>
        <span className="employee-profile-card__chevron" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      <div
        className="knowledge-bar"
        style={{ ["--knowledge-pct" as string]: `${percent}%` }}
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.profile.knowledge}
      >
        <div className="knowledge-bar__fill" />
      </div>

      {open ? (
        <>
          <div className="employee-profile-card__fields">
            {miniLines.length > 0 ? (
              <dl className="space-y-2">
                {miniLines.map((line) => (
                  <div key={line.key} className="employee-profile-card__field">
                    <dt>{line.label}</dt>
                    <dd>{line.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs leading-6 text-[var(--muted)]">{t.profile.miniCardEmpty}</p>
            )}
          </div>

          <FlexibilitySlider
            userId={props.userId}
            value={card.flexibility}
            onChange={props.onFlexibilityChange}
          />

          <p className="employee-profile-card__live">
            <span className="live-pulse inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            {t.profile.autoFillHint}
          </p>
        </>
      ) : null}
    </div>
  );
}
