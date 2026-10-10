"use client";

import { useCallback, useRef, useState } from "react";
import type { LabelingPair } from "@/application/admin-labeling";
import { LlmJudgeComparePanel } from "@/components/admin/labeling/LlmJudgeComparePanel";
import { LabelingScoreBreakdown } from "@/components/admin/labeling/LabelingScoreBreakdown";
import { useTranslation } from "@/components/LocaleProvider";
import { hebrewDisplayCandidateCard, hebrewDisplayJobCard } from "@/domain/hebrew-display";
import type { RelevanceLabel } from "@/domain/matching-eval/types";

function SummaryCard(props: { title: string; subtitle: string; lines: string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(props.defaultOpen ?? true);
  return (
    <article className="rounded-xl border border-[var(--stroke)] bg-white/95 text-sm shadow-sm">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-right"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] text-[var(--muted)]">{props.subtitle}</span>
          <span className="block truncate font-semibold text-[var(--hero)]">{props.title}</span>
        </span>
        <span className="shrink-0 text-xs text-[var(--muted)]">{open ? "▾" : "◂"}</span>
      </button>
      {open ? (
        <ul className="space-y-1 border-t border-[var(--stroke)]/70 px-3 py-2 text-xs leading-snug text-[var(--ink)]">
          {props.lines.slice(0, open ? 8 : 0).map((line) => (
            <li key={line} className="truncate">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function LabelingMobileView(props: {
  pair: LabelingPair;
  holdoutLabeled?: number;
  holdoutTotal?: number;
  submitting: boolean;
  onSubmit: (label: RelevanceLabel) => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const jobView = hebrewDisplayJobCard(props.pair.job);
  const candidateView = hebrewDisplayCandidateCard(props.pair.candidate);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t0 = e.changedTouches[0];
    if (!t0) return;
    touchStart.current = { x: t0.clientX, y: t0.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      const t0 = e.changedTouches[0];
      if (!start || !t0 || props.submitting) return;
      const dx = t0.clientX - start.x;
      const dy = t0.clientY - start.y;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx > 0) props.onSubmit("good");
      else props.onSubmit("bad");
    },
    [props],
  );

  const progress =
    props.holdoutTotal && props.holdoutTotal > 0
      ? `${props.holdoutLabeled ?? 0}/${props.holdoutTotal} holdout`
      : null;

  const jobLines = [
    props.pair.job.location?.trim(),
    props.pair.job.mustHaves?.slice(0, 3).join(" · "),
    props.pair.job.salaryRange?.trim(),
  ].filter(Boolean) as string[];

  const candLines = [
    props.pair.candidate.location?.trim(),
    props.pair.candidate.skills?.slice(0, 4).join(" · "),
    props.pair.candidate.languages?.join(", "),
  ].filter(Boolean) as string[];

  return (
    <div
      className="space-y-3 md:hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="labeling-mobile-view"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="rounded-full bg-[var(--chip)] px-2 py-0.5 font-medium text-[var(--hero)]">
          {props.pair.bucket === "holdout" ? "holdout" : props.pair.bucket}
        </span>
        {progress ? <span className="text-[var(--muted)]">התקדמות: {progress}</span> : null}
        <span className="text-[var(--muted)]">החלקה: ימין=מתאים, שמאל=לא</span>
      </div>

      <LabelingScoreBreakdown
        scores={props.pair.scores}
        bucket={props.pair.bucket}
        jobId={props.pair.jobId}
        candidateId={props.pair.candidateId}
      />

      {props.pair.bucket === "holdout" || props.pair.bucket === "test-run" ? (
        <LlmJudgeComparePanel judge={props.pair.llmJudge} compact suggestion />
      ) : null}

      <div className="grid gap-2">
        <SummaryCard title={jobView.title} subtitle={t.adminLabeling.jobCard} lines={jobLines} defaultOpen />
        <SummaryCard
          title={candidateView.desiredRole}
          subtitle={t.adminLabeling.candidateCard}
          lines={candLines}
          defaultOpen
        />
      </div>

      <div className="admin-label-thumb-bar">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1.5">
          <button
            type="button"
            data-testid="label-good"
            disabled={props.submitting}
            className="min-h-11 rounded-xl bg-emerald-600 px-1 text-xs font-bold text-white disabled:opacity-50"
            onClick={() => props.onSubmit("good")}
          >
            מתאים
          </button>
          <button
            type="button"
            data-testid="label-acceptable"
            disabled={props.submitting}
            className="min-h-11 rounded-xl bg-amber-500 px-1 text-xs font-bold text-white disabled:opacity-50"
            onClick={() => props.onSubmit("acceptable")}
          >
            חלקי
          </button>
          <button
            type="button"
            data-testid="label-bad"
            disabled={props.submitting}
            className="min-h-11 rounded-xl bg-rose-600 px-1 text-xs font-bold text-white disabled:opacity-50"
            onClick={() => props.onSubmit("bad")}
          >
            לא מתאים
          </button>
          <button
            type="button"
            data-testid="label-skip"
            disabled={props.submitting}
            className="min-h-11 rounded-xl border border-[var(--stroke)] bg-white px-1 text-xs font-semibold text-[var(--muted)] disabled:opacity-50"
            onClick={props.onSkip}
          >
            דלג
          </button>
        </div>
      </div>
    </div>
  );
}
