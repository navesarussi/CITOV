"use client";

import type { LabelingPair } from "@/application/admin-labeling";
import type { LabelFieldRow } from "@/domain/labeling-field-map";

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

function jobRows(job: LabelingPair["job"]) {
  return [
    { label: "כותרת", value: job.title },
    { label: "תחום", value: job.field },
    { label: "מיקום", value: job.location },
    { label: "מודל עבודה", value: job.workModel },
    { label: "היקף", value: job.scope },
    { label: "סוג העסקה", value: job.employmentType },
    { label: "משמרות", value: job.shiftPattern },
    { label: "סופ״ש / לילה", value: `${job.weekendsRequired} / ${job.nightShiftsRequired}` },
    { label: "שכר", value: job.salaryRange || `${job.salaryMin}–${job.salaryMax}` },
    { label: "ותק / בכירות", value: `${job.minExperienceYears} · ${job.seniorityLevel}` },
    { label: "חובה", value: job.mustHaves.join(", ") },
    { label: "יתרון", value: job.niceToHaves.join(", ") },
    { label: "שפות", value: job.requiredLanguages.join(", ") },
    { label: "כלי עבודה", value: job.toolsRequired },
    { label: "אופי / התאמה", value: job.personalityFit },
    { label: "תרבות צוות", value: job.teamCulture },
    { label: "סגנון ניהול", value: job.managementStyle },
    { label: "דרישות פיזיות", value: job.physicalDemands },
    { label: "גמישות דרישות", value: String(job.flexibility) },
    { label: "סיפור משרה", value: job.narrative },
  ];
}

function candidateRows(c: LabelingPair["candidate"]) {
  return [
    { label: "תפקיד מבוקש", value: c.desiredRole },
    { label: "תחום", value: c.field },
    { label: "מיקום", value: c.location },
    { label: "שכר", value: c.salaryExpectation || `${c.salaryMin}–${c.salaryMax}` },
    { label: "ותק", value: String(c.experienceYears ?? "") + " " + c.experienceLevel },
    { label: "כישורים", value: c.skills.join(", ") },
    { label: "שפות", value: c.languages.join(", ") },
    { label: "אופי", value: c.personality },
    { label: "סגנון עבודה", value: c.workStyle },
    { label: "קווים אדומים", value: c.dealBreakers },
    { label: "משמרות", value: c.shiftPreference },
    { label: "גמישות", value: String(c.flexibility) },
    { label: "סיפור", value: c.narrative },
  ];
}

function companyRows(co: LabelingPair["company"]) {
  return [
    { label: "חברה", value: co.name },
    { label: "תעשייה", value: co.industry },
    { label: "גודל", value: co.size },
    { label: "מיקום", value: co.headquarters },
    { label: "תרבות", value: co.culture },
    { label: "ערכים", value: co.values },
    { label: "סביבה", value: co.workEnvironment },
    { label: "תקציר", value: co.summary },
  ];
}

export function LabelingPairView(props: { pair: LabelingPair }) {
  const { pair } = props;
  const s = pair.scores;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4 text-sm">
        <p className="font-semibold text-[var(--hero)]">ציונים והסבר</p>
        <p className="mt-1">
          Rule: <strong>{(s.ruleScore * 100).toFixed(1)}%</strong> · Hybrid:{" "}
          <strong>{(s.hybridScore * 100).toFixed(1)}%</strong> · Semantic:{" "}
          {(s.semanticScore * 100).toFixed(1)}% · סף תור: {s.queueThreshold.toFixed(2)} (
          {s.hybridQueued ? "בתור" : "מחוץ לתור"})
        </p>
        <p className="mt-2 text-[var(--muted)]">{s.reason}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-white/80 p-3 text-xs">
            <p className="font-semibold">Rule breakdown</p>
            <p>base {s.ruleBreakdown.baseFit.toFixed(2)} → after flex {s.ruleBreakdown.afterFlexibility.toFixed(2)}</p>
            <p>
              must-have overlap {(s.ruleBreakdown.mustHaveOverlap * 100).toFixed(0)}% · flex משולב{" "}
              {s.ruleBreakdown.combinedFlex}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 p-3 text-xs">
            <p className="font-semibold">Hybrid / semantic</p>
            <p>
              role {(s.segmentSimilarities.role * 100).toFixed(0)}% · skills{" "}
              {(s.segmentSimilarities.skills * 100).toFixed(0)}% · profile{" "}
              {(s.segmentSimilarities.profile * 100).toFixed(0)}%
            </p>
            <p>{s.semanticBreakdown.mustHaveGateDetail}</p>
            <p>
              weights {s.semanticBreakdown.weights.semantic}/{s.semanticBreakdown.weights.rule}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          bucket: {pair.bucket} · {pair.jobId} ↔ {pair.candidateId}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <CardBlock title={pair.company.name || pair.employerName || "מעסיק"} subtitle="כרטיס חברה" rows={companyRows(pair.company)} />
        <CardBlock title={pair.job.title} subtitle={`משרה · ${pair.jobId}`} rows={jobRows(pair.job)} />
        <CardBlock title={pair.candidate.desiredRole} subtitle={`מועמד/ת · ${pair.candidateId}`} rows={candidateRows(pair.candidate)} />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-[var(--hero)]">השוואת שדות (הדגשה)</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {pair.fieldRows.map((row) => (
            <div
              key={row.key}
              className={`rounded-xl border p-3 text-xs ${alignClass(row.align)}`}
            >
              <p className="font-semibold">{row.label}</p>
              <p className="mt-1">
                <span className="text-[var(--muted)]">משרה:</span> {row.jobValue || "—"}
              </p>
              <p>
                <span className="text-[var(--muted)]">מועמד:</span> {row.candidateValue || "—"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
