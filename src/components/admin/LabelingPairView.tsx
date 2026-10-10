"use client";

import type { LabelingPair } from "@/application/admin-labeling";
import { LlmJudgeComparePanel } from "@/components/admin/labeling/LlmJudgeComparePanel";
import { MatchExplainButton, MatchExplainDrawer } from "@/components/admin/MatchExplainDrawer";
import { LabelingScoreBreakdown } from "@/components/admin/labeling/LabelingScoreBreakdown";
import { useState } from "react";
import { useTranslation } from "@/components/LocaleProvider";
import { hebrewDisplayCandidateCard, hebrewDisplayJobCard } from "@/domain/hebrew-display";
import type { LabelFieldRow } from "@/domain/labeling-field-map";
import {
  labelingCandidateRows,
  labelingCompanyRows,
  labelingJobRows,
} from "@/domain/labeling-card-rows";

function alignClass(align: LabelFieldRow["align"]): string {
  if (align === "match") return "bg-emerald-50 border-emerald-200";
  if (align === "partial") return "bg-amber-50 border-amber-200";
  if (align === "conflict") return "bg-rose-50 border-rose-200";
  return "bg-white border-[var(--stroke)]";
}

function CardBlock(props: {
  title: string;
  subtitle: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <article className="rounded-2xl border border-[var(--stroke)] bg-white/90 p-4 shadow-sm">
      <p className="text-xs text-[var(--muted)]">{props.subtitle}</p>
      <h3 className="text-lg font-bold text-[var(--hero)]">{props.title}</h3>
      <dl className="mt-3 max-h-[420px] space-y-2 overflow-y-auto text-sm">
        {props.rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[minmax(7rem,30%)_1fr] gap-2 border-b border-[var(--stroke)]/60 pb-2">
            <dt className="font-medium text-[var(--muted)]">{r.label}</dt>
            <dd className="text-[var(--ink)]">{r.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function LabelingPairView(props: {
  pair: LabelingPair;
}) {
  const { t } = useTranslation();
  const { pair } = props;
  const [explainId, setExplainId] = useState<string | null>(null);
  const jobView = hebrewDisplayJobCard(pair.job);
  const candidateView = hebrewDisplayCandidateCard(pair.candidate);

  return (
    <div className="space-y-4">
      <LabelingScoreBreakdown
        scores={pair.scores}
        bucket={pair.bucket}
        jobId={pair.jobId}
        candidateId={pair.candidateId}
      />
      {pair.bucket === "test-run" || pair.bucket === "holdout" ? (
        <LlmJudgeComparePanel judge={pair.llmJudge} suggestion={pair.bucket === "holdout"} />
      ) : null}
      {pair.matchId ? (
        <MatchExplainButton matchId={pair.matchId} onOpen={setExplainId} />
      ) : null}
      <MatchExplainDrawer matchId={explainId} onClose={() => setExplainId(null)} />

      <div className="grid gap-4 lg:grid-cols-3">
        <CardBlock
          title={pair.company.name || pair.employerName || t.adminLabeling.companyCard}
          subtitle={t.adminLabeling.companyCard}
          rows={labelingCompanyRows(pair.company)}
        />
        <CardBlock
          title={jobView.title}
          subtitle={t.adminLabeling.jobCard}
          rows={labelingJobRows(pair.job)}
        />
        <CardBlock
          title={candidateView.desiredRole}
          subtitle={t.adminLabeling.candidateCard}
          rows={labelingCandidateRows(pair.candidate)}
        />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-[var(--hero)]">{t.adminLabeling.fieldCompare}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {pair.fieldRows.map((row) => (
            <div
              key={row.key}
              className={`rounded-xl border p-3 text-xs ${alignClass(row.align)}`}
            >
              <p className="font-semibold">{row.label}</p>
              <p className="mt-1">
                <span className="text-[var(--muted)]">{t.adminLabeling.jobCard}:</span> {row.jobValue || "—"}
              </p>
              <p>
                <span className="text-[var(--muted)]">{t.adminLabeling.candidateCard}:</span>{" "}
                {row.candidateValue || "—"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
