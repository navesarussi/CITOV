"use client";

import { useState } from "react";
import type { MatchPairExplanation } from "@/application/match-pair-explain";
import { useTranslation } from "@/components/LocaleProvider";
import { ScoreBar } from "@/components/admin/labeling/ScoreBar";

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function LabelingScoreBreakdown(props: {
  scores: MatchPairExplanation;
  bucket?: string;
  jobId?: string;
  candidateId?: string;
}) {
  const { t, fmt, locale } = useTranslation();
  const [showTech, setShowTech] = useState(false);
  const s = props.scores;
  const sem = s.semanticBreakdown;
  const w = sem.weights;

  const mustHaveDetail =
    sem.mustHaveGateDetail.startsWith("אין וקטורים") || sem.mustHaveGateDetail.includes("not available")
      ? locale === "en"
        ? "Vectors unavailable — smart score uses rules only"
        : "אין וקטורים — הציון החכם מבוסס על כללים בלבד"
      : sem.mustHaveGate
        ? fmt(t.adminLabeling.mustHaveGateBlocked, {
            pct: pct(s.ruleBreakdown.mustHaveOverlap).replace("%", ""),
          })
        : fmt(t.adminLabeling.mustHaveOverlapDetail, {
            pct: pct(s.ruleBreakdown.mustHaveOverlap).replace("%", ""),
          });

  return (
    <section className="panel space-y-4 rounded-[var(--panel-radius)] p-5">
      <h2 className="text-base font-semibold text-[var(--hero)]">{t.adminLabeling.scoreTitle}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--stroke)] bg-white/80 p-4">
          <p className="text-xs text-[var(--muted)]">{t.adminLabeling.finalHybrid}</p>
          <p className="text-2xl font-bold text-[var(--hero)]">{pct(s.hybridScore)}</p>
          <ScoreBar className="mt-2" value={s.hybridScore} />
          <p className="mt-2 text-xs text-[var(--muted)]">
            {t.adminLabeling.queueStatus}:{" "}
            <strong>{s.hybridQueued ? t.adminLabeling.inQueue : t.adminLabeling.outOfQueue}</strong>
            {" · "}
            {t.adminLabeling.queueThreshold} {s.queueThreshold.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--stroke)] bg-white/80 p-4">
          <p className="text-xs text-[var(--muted)]">{t.adminLabeling.finalRule}</p>
          <p className="text-2xl font-bold text-[var(--hero)]">{pct(s.ruleScore)}</p>
          <ScoreBar className="mt-2" value={s.ruleScore} tone="muted" />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--stroke)] p-4">
        <p className="text-sm font-medium text-[var(--hero)]">{t.adminLabeling.semanticRole}</p>
        {(
          [
            [t.adminLabeling.semanticRole, s.segmentSimilarities.role],
            [t.adminLabeling.semanticSkills, s.segmentSimilarities.skills],
            [t.adminLabeling.semanticProfile, s.segmentSimilarities.profile],
          ] as const
        ).map(([label, val]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
              <span>{label}</span>
              <span>{pct(val)}</span>
            </div>
            <ScoreBar value={val} />
          </div>
        ))}
        <p className="text-xs text-[var(--muted)]">
          {t.adminLabeling.hybridWeight}: {w.semantic} / {w.rule}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-[var(--stroke)] p-4 text-sm">
          <p className="font-medium text-[var(--hero)]">{t.adminLabeling.finalRule}</p>
          <div>
            <div className="flex justify-between text-xs text-[var(--muted)]">
              <span>{t.adminLabeling.ruleBase}</span>
              <span>{pct(s.ruleBreakdown.baseFit)}</span>
            </div>
            <ScoreBar value={s.ruleBreakdown.baseFit} tone="muted" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-[var(--muted)]">
              <span>{t.adminLabeling.ruleAfterFlex}</span>
              <span>{pct(s.ruleBreakdown.afterFlexibility)}</span>
            </div>
            <ScoreBar value={s.ruleBreakdown.afterFlexibility} tone="muted" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-[var(--muted)]">
              <span>{t.adminLabeling.mustHaveOverlap}</span>
              <span>{pct(s.ruleBreakdown.mustHaveOverlap)}</span>
            </div>
            <ScoreBar value={s.ruleBreakdown.mustHaveOverlap} />
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-[var(--stroke)] p-4 text-sm">
          <p className="font-medium text-[var(--hero)]">{t.adminLabeling.mustHaveGate}</p>
          <p className="text-sm text-[var(--muted)]">{mustHaveDetail}</p>
          {sem.mustHaveGate ? (
            <p className="text-xs text-[var(--warn)]">{t.adminLabeling.mustHaveGateActive}</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="text-xs font-medium text-[var(--accent)] hover:underline"
        onClick={() => setShowTech((v) => !v)}
      >
        {t.adminLabeling.technicalDetails} {showTech ? "▾" : "▸"}
      </button>
      {showTech ? (
        <p className="font-mono text-xs text-[var(--muted)]">
          {props.bucket ? `bucket: ${props.bucket}` : null}
          {props.jobId && props.candidateId ? ` · ${props.jobId} ↔ ${props.candidateId}` : null}
          {" · "}
          semantic raw {(s.semanticScore * 100).toFixed(1)}%
        </p>
      ) : null}
    </section>
  );
}
