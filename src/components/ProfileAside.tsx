"use client";

import { useEffect, useMemo, useState } from "react";
import { FlexibilitySlider } from "@/components/FlexibilitySlider";
import { useTranslation } from "@/components/LocaleProvider";
import { candidateRows, jobRows, knowledgePercent } from "@/domain/card-progress";
import {
  emptyCandidateCard,
  emptyJobCard,
  type CandidateCard,
  type JobCard,
} from "@/domain/types";

export function ProfileAside(props: {
  kind: "employee" | "employer";
  userId: string;
  card: CandidateCard | JobCard | null | undefined;
  pendingQuestions?: { id: string; question: string }[];
  onFlexibilityChange?: (value: number) => void;
}) {
  const { t, fmt } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    void fetch("/api/session")
      .then((r) => r.json())
      .then((d: { isAdmin?: boolean }) => setIsAdmin(Boolean(d.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, []);

  const c = useMemo(
    () =>
      props.card ??
      (props.kind === "employee" ? emptyCandidateCard() : emptyJobCard()),
    [props.card, props.kind],
  );

  // Derive the slider value straight from the card (the slider keeps its own
  // local state for immediate drag feedback), so ProfileAside no longer needs a
  // state+effect that re-fired on every parent render (the old jank/loop).
  const flexValue = clampFlex((c as CandidateCard | JobCard).flexibility);

  const labels = (props.kind === "employee"
    ? t.cardFields.candidate
    : t.cardFields.job) as Record<string, string>;
  const rows = useMemo(
    () =>
      props.kind === "employee"
        ? candidateRows(c as CandidateCard, labels)
        : jobRows(c as JobCard, labels),
    [c, labels, props.kind],
  );
  const percent = useMemo(() => knowledgePercent(rows), [rows]);

  return (
    <aside className="premium-panel panel-in flex max-h-[70vh] flex-col rounded-[1.35rem] p-4">
      <h2 className="text-sm font-semibold tracking-tight text-[var(--ink)]">
        {props.kind === "employee" ? t.profile.yourCard : t.profile.jobCard}
      </h2>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span>{t.profile.knowledge}</span>
          <span>{fmt(t.profile.knowledgePercent, { percent })}</span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-[var(--chip)]"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t.profile.knowledge}
        >
          <div
            className="progress-fill h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
          {t.profile.knowledgeHint}
        </p>
      </div>

      <FlexibilitySlider
        userId={props.userId}
        value={flexValue}
        onChange={(v) => props.onFlexibilityChange?.(v)}
      />

      {props.pendingQuestions && props.pendingQuestions.length > 0 ? (
        <div className="mt-3 rounded-xl bg-[var(--warn-bg)] p-3 text-xs text-[var(--warn)]">
          {fmt(t.profile.pendingQuestions, { count: props.pendingQuestions.length })}
        </div>
      ) : null}

      {isAdmin ? (
        <>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{t.profile.autoFillHint}</p>
          <dl className="mt-3 space-y-2 overflow-y-auto pe-1 text-sm">
            {rows.map((row) => (
              <div key={row.key} className={row.filled ? "" : "opacity-55"}>
                <dt className="text-xs text-[var(--muted)]">{row.label}</dt>
                <dd className="text-[var(--ink)]">{row.value || t.profile.emptyValue}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </aside>
  );
}

function clampFlex(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(10, Math.round(value)));
}
