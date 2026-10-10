"use client";

import type { DisagreementRow, LlmJudgeDashboardMetrics } from "@/application/admin-labeling-metrics";
import { useTranslation } from "@/components/LocaleProvider";
import type { Messages } from "@/i18n";
import { Button } from "@/components/ui/Button";
import { ScoreBar } from "@/components/admin/labeling/ScoreBar";

export type LabelingMetricsView = {
  totalLabels: number;
  ready: boolean;
  minRequired?: number;
  message?: string;
  labeledPairs?: number;
  labelCounts?: { good: number; acceptable: number; bad: number };
  agreementRate?: number;
  queueThreshold?: number;
  suggestedThreshold?: number | null;
  disagreements?: DisagreementRow[];
  matchers?: {
    id: string;
    threshold: number;
    precisionAt5: number;
    recallAt5: number;
    goodMissed: number;
    badQueued: number;
  }[];
  llmJudge?: LlmJudgeDashboardMetrics;
  holdout?: { holdoutTotal: number; holdoutLabeled: number; holdoutRemaining: number };
};

function matcherTitle(id: string, legacy: string, smart: string): string {
  if (id === "rule-based-v1") return legacy;
  if (id === "hybrid-production") return smart;
  return id;
}

function KpiTile(props: { label: string; tip: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--stroke)] bg-white/80 p-3">
      <p className="text-xs text-[var(--muted)]" title={props.tip}>
        {props.label}
      </p>
      <p className="mt-1 text-xl font-bold text-[var(--hero)]">{props.value}</p>
      {props.sub ? <p className="mt-0.5 text-xs text-[var(--muted)]">{props.sub}</p> : null}
    </div>
  );
}

function humanLabelChip(label: string, t: Messages) {
  const map: Record<string, { text: string; className: string }> = {
    good: { text: t.adminLabeling.labelGood, className: "bg-emerald-100 text-emerald-900" },
    acceptable: { text: t.adminLabeling.labelAcceptable, className: "bg-amber-100 text-amber-900" },
    bad: { text: t.adminLabeling.labelBad, className: "bg-rose-100 text-rose-900" },
  };
  const row = map[label] ?? { text: label, className: "bg-[var(--chip)]" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.className}`}>{row.text}</span>
  );
}

export function LabelingMetricsPanel(props: {
  metrics: LabelingMetricsView;
  submitting: boolean;
  onApplyThreshold: () => void;
  onOpenPair: (jobId: string, candidateId: string) => void;
}) {
  const { t, fmt } = useTranslation();
  const m = props.metrics;
  const counts = m.labelCounts ?? { good: 0, acceptable: 0, bad: 0 };
  const totalForBars = Math.max(1, counts.good + counts.acceptable + counts.bad);

  return (
    <section className="panel space-y-5 rounded-[var(--panel-radius)] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--hero)]">{t.adminLabeling.dashboardTitle}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {t.adminLabeling.totalLabels}: <strong className="text-[var(--ink)]">{m.totalLabels}</strong>
          </p>
        </div>
        {m.ready ? (
          <div className="text-sm text-[var(--muted)]">
            {t.adminLabeling.agreement}:{" "}
            <strong className="text-[var(--hero)]">{((m.agreementRate ?? 0) * 100).toFixed(0)}%</strong>
            <span className="mx-2">·</span>
            {t.adminLabeling.queueThreshold}:{" "}
            <strong>{(m.queueThreshold ?? 0.6).toFixed(2)}</strong>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["good", t.adminLabeling.labelGood, counts.good],
            ["acceptable", t.adminLabeling.labelAcceptable, counts.acceptable],
            ["bad", t.adminLabeling.labelBad, counts.bad],
          ] as const
        ).map(([key, label, n]) => (
          <div key={key}>
            <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
              <span>{label}</span>
              <span>{n}</span>
            </div>
            <ScoreBar value={n} max={totalForBars} tone={key === "bad" ? "warn" : "accent"} />
          </div>
        ))}
      </div>

      {!m.ready ? (
        <p className="rounded-xl bg-[var(--chip)] px-3 py-2 text-sm text-[var(--muted)]">
          {m.message ?? fmt(t.adminLabeling.minLabelsNeeded, { n: m.minRequired ?? 3 })}
        </p>
      ) : null}

      {(m.llmJudge?.total ?? 0) > 0 ? (
        <div className="rounded-2xl border border-[var(--stroke)] bg-white/90 p-4">
          <h3 className="text-sm font-semibold text-[var(--hero)]">{t.adminLabeling.llmJudgeTitle}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{t.adminLabeling.llmJudgeHint}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label={t.adminLabeling.llmJudgeAgreementAb}
              tip={t.adminLabeling.llmJudgeAgreementAbTip}
              value={`${((m.llmJudge!.judgeAgreementRate ?? 0) * 100).toFixed(0)}%`}
              sub={
                m.llmJudge!.judgeDisagreementCount > 0
                  ? `${m.llmJudge!.judgeDisagreementCount} מחלוקות א׳/ב׳`
                  : fmt(t.adminLabeling.llmJudgePairsSub, { n: m.llmJudge!.total })
              }
            />
            <KpiTile
              label={t.adminLabeling.llmJudgeAutoSkip}
              tip={t.adminLabeling.llmJudgeAutoSkipTip}
              value={String(m.llmJudge!.autoSkipped)}
            />
            <KpiTile
              label={t.adminLabeling.llmJudgeOwnerQueue}
              tip={t.adminLabeling.llmJudgeOwnerQueueTip}
              value={String(m.llmJudge!.needsOwner)}
              sub={fmt(t.adminLabeling.llmJudgeDisagreementsSub, { n: m.llmJudge!.total - m.llmJudge!.autoSkipped })}
            />
            <KpiTile
              label={t.adminLabeling.llmJudgeHumanAudit}
              tip={t.adminLabeling.llmJudgeHumanAuditTip}
              value={
                m.llmJudge!.humanAuditAgreementRate != null
                  ? `${(m.llmJudge!.humanAuditAgreementRate * 100).toFixed(0)}%`
                  : "—"
              }
              sub={
                m.llmJudge!.humanAuditCompared > 0
                  ? fmt(t.adminLabeling.llmJudgeHumanAuditSub, { n: m.llmJudge!.humanAuditCompared })
                  : t.adminLabeling.llmJudgeHumanAuditPending
              }
            />
          </div>
        </div>
      ) : null}

      {m.ready && m.matchers?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {m.matchers.map((matcher) => (
            <div key={matcher.id} className="space-y-3 rounded-2xl border border-[var(--stroke)] p-4">
              <p className="text-sm font-semibold text-[var(--hero)]">
                {matcherTitle(matcher.id, t.adminLabeling.legacyMatcher, t.adminLabeling.smartMatcher)}
              </p>
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                {matcher.id === "rule-based-v1"
                  ? t.adminLabeling.legacyMatcherHint
                  : t.adminLabeling.smartMatcherHint}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {t.adminLabeling.queueThreshold}: {matcher.threshold.toFixed(2)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <KpiTile
                  label={t.adminLabeling.kpiPrecision}
                  tip={t.adminLabeling.kpiPrecisionTip}
                  value={`${(matcher.precisionAt5 * 100).toFixed(0)}%`}
                />
                <KpiTile
                  label={t.adminLabeling.kpiRecall}
                  tip={t.adminLabeling.kpiRecallTip}
                  value={`${(matcher.recallAt5 * 100).toFixed(0)}%`}
                />
                <KpiTile
                  label={t.adminLabeling.kpiGoodMissed}
                  tip={t.adminLabeling.kpiGoodMissedTip}
                  value={String(matcher.goodMissed)}
                />
                <KpiTile
                  label={t.adminLabeling.kpiBadQueued}
                  tip={t.adminLabeling.kpiBadQueuedTip}
                  value={String(matcher.badQueued)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {m.suggestedThreshold != null ? (
        <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)] p-4">
          <h3 className="text-sm font-semibold text-[var(--hero)]">{t.adminLabeling.suggestedThresholdTitle}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {fmt(t.adminLabeling.suggestedThresholdBody, { count: m.labeledPairs ?? m.totalLabels })}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {fmt(t.adminLabeling.applyThresholdHelp, {
              current: (m.queueThreshold ?? 0.6).toFixed(2),
              suggested: m.suggestedThreshold.toFixed(2),
            })}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{t.adminLabeling.applyThresholdReversible}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--hero)]">{m.suggestedThreshold.toFixed(2)}</p>
          <Button
            className="mt-3 min-h-11"
            variant="secondary"
            disabled={props.submitting}
            onClick={props.onApplyThreshold}
          >
            {t.adminLabeling.applyThreshold}
          </Button>
        </div>
      ) : null}

      {(m.disagreements?.length ?? 0) > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-[var(--hero)]">{t.adminLabeling.disagreementsTitle}</h3>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {m.disagreements!.map((d) => (
              <li key={`${d.jobId}:${d.candidateId}`}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-2 rounded-xl border border-[var(--stroke)] bg-white/90 p-3 text-start transition hover:border-[var(--accent)] sm:flex-row sm:items-center"
                  onClick={() => props.onOpenPair(d.jobId, d.candidateId)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">
                      {d.jobTitle} ↔ {d.candidateTitle}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">{t.adminLabeling.humanLabel}</span>
                      {humanLabelChip(d.humanLabel, t)}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.systemQueued ? "bg-sky-100 text-sky-900" : "bg-[var(--chip)] text-[var(--muted)]"
                        }`}
                      >
                        {d.systemQueued ? t.adminLabeling.systemQueued : t.adminLabeling.systemNotQueued}
                      </span>
                    </div>
                  </div>
                  <div className="w-full sm:w-36">
                    <p className="mb-1 text-xs text-[var(--muted)]">{t.adminLabeling.finalHybrid}</p>
                    <ScoreBar value={d.hybridScore} tone={d.systemQueued ? "accent" : "muted"} />
                    <p className="mt-1 text-xs text-[var(--muted)]">{(d.hybridScore * 100).toFixed(0)}%</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
