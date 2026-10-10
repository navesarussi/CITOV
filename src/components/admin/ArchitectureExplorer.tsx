"use client";

import type { ArchitectureLiveStats, ArchitectureNodeStat } from "@/application/admin-architecture-live";
import type {
  ArchitectureNode,
  ArchitectureNodeId,
  EngineeringDilemma,
  FlowStep,
} from "@/domain/admin-architecture-content";
import { ARCHITECTURE_EDGES } from "@/domain/admin-architecture-content";
import { ArchitectureDiagram } from "@/components/admin/architecture/ArchitectureDiagram";
import { EndToEndJourneyMap } from "@/components/admin/architecture/EndToEndJourneyMap";
import { adminTerms as T } from "@/i18n/admin-terms";
import { deferEffectTask, useDeferredEffect } from "@/lib/deferred-effect";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

type Payload = {
  nodes: ArchitectureNode[];
  flows: Record<
    "cvUpload" | "chatMessage" | "matchPipeline" | "geminiDown",
    { titleHe: string; steps: FlowStep[] }
  >;
  safety: { titleHe: string; bodyHe: string }[];
  dilemmas: EngineeringDilemma[];
  live: ArchitectureLiveStats;
};

const NODE_LAYOUT: { id: ArchitectureNodeId; col: number; row: number }[] = [
  { id: "browser", col: 0, row: 0 },
  { id: "next", col: 1, row: 0 },
  { id: "api", col: 2, row: 0 },
  { id: "chat", col: 0, row: 1 },
  { id: "cv", col: 1, row: 1 },
  { id: "matching", col: 2, row: 1 },
  { id: "embeddings", col: 0, row: 2 },
  { id: "postgres", col: 1, row: 2 },
  { id: "gemini", col: 2, row: 2 },
  { id: "monitoring", col: 0, row: 3 },
  { id: "cron", col: 1, row: 3 },
];

/** Nodes emphasized per flow animation (approximate path). */
const FLOW_NODE_HIGHLIGHT: Record<keyof Payload["flows"], ArchitectureNodeId[]> = {
  cvUpload: ["browser", "api", "cv", "gemini", "postgres", "chat"],
  chatMessage: ["browser", "next", "api", "chat", "gemini", "embeddings", "matching", "postgres"],
  matchPipeline: ["matching", "embeddings", "gemini", "postgres"],
  geminiDown: ["gemini", "chat", "cron", "monitoring"],
};

const FLOW_STEP_MS = 3200;

function kindBadge(kind: FlowStep["kind"]): { label: string; className: string } {
  if (kind === "code") return { label: "קוד", className: "bg-slate-100 text-slate-800" };
  if (kind === "model") return { label: "מודל", className: "bg-violet-100 text-violet-900" };
  return { label: "משולב", className: "bg-teal-100 text-teal-900" };
}

function StatTile(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--stroke)] bg-white/85 p-4 shadow-sm transition hover:shadow-md">
      <p className="text-xs font-medium text-[var(--muted)]">{props.label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--hero)]">{props.value}</p>
      {props.sub ? <p className="mt-1 text-xs text-[var(--muted)]">{props.sub}</p> : null}
    </div>
  );
}

function NodeStatsList(props: { stats?: ArchitectureNodeStat[] }) {
  if (!props.stats?.length) return null;
  return (
    <ul className="mt-4 space-y-2 rounded-2xl border border-[var(--stroke)] bg-white/80 p-3 text-sm">
      {props.stats.map((s) => (
        <li key={s.labelHe} className="flex justify-between gap-3">
          <span className="text-[var(--muted)]">{s.labelHe}</span>
          <span className="font-semibold text-[var(--hero)]">{s.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function ArchitectureExplorer() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<ArchitectureNodeId | null>("matching");
  const [flowKey, setFlowKey] = useState<keyof Payload["flows"]>("matchPipeline");
  const [flowStep, setFlowStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [techOpen, setTechOpen] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/architecture");
      const json = (await res.json()) as Payload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "שגיאה בטעינה");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useDeferredEffect(() => {
    deferEffectTask(() => {
      void load();
    });
  }, [load]);

  const flow = data?.flows[flowKey];
  const flowProgress = flow ? (flowStep + 1) / flow.steps.length : 0;

  useDeferredEffect(() => {
    if (!autoPlay || !flow) return;
    const stepCount = flow.steps.length;
    const id = window.setInterval(() => {
      setFlowStep((s) => (s >= stepCount - 1 ? 0 : s + 1));
    }, FLOW_STEP_MS);
    return () => window.clearInterval(id);
  }, [autoPlay, flowKey, flow?.steps.length]);

  const flowHighlight = useMemo(() => FLOW_NODE_HIGHLIGHT[flowKey], [flowKey]);

  const selected = data?.nodes.find((n) => n.id === selectedId) ?? null;
  const nodeLive = selectedId && data ? data.live.nodeStats[selectedId] : undefined;

  const latencyHe =
    data?.live.ai.avgLatencyMs != null ? `${data.live.ai.avgLatencyMs} מילישניות` : undefined;

  return (
    <div className="space-y-10 pb-16" dir="rtl">
      <header className="rounded-3xl border border-[var(--stroke)] bg-gradient-to-bl from-[var(--accent)]/12 via-white to-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">CITOV</p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--hero)] sm:text-3xl">ארכיטקטורת המערכת</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          מפת רכיבים, זרימות עבודה, ו{T.matchingEngine} — מעודכן מהמאגר ומציג נתונים חיים מהסביבה.
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>
      ) : null}

      {data ? (
        <>
          <EndToEndJourneyMap />

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="קריאות AI (7 ימים)" value={String(data.live.ai.calls7d)} sub={latencyHe ? `זמן תגובה ממוצע: ${latencyHe}` : undefined} />
            <StatTile label="עלות AI (7 ימים)" value={`$${data.live.ai.costUsd7d.toFixed(2)}`} />
            <StatTile label="אירועי ניטור פתוחים" value={String(data.live.ai.errors7d)} />
            <StatTile
              label={T.threshold}
              value={data.live.matching.queueThreshold.toFixed(2)}
              sub={`${T.embedding}: ${(data.live.matching.semanticWeight * 100).toFixed(0)}% · קלאסי: ${(data.live.matching.ruleWeight * 100).toFixed(0)}%`}
            />
          </section>

          {data.live.llmJudge.total > 0 ? (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="שופטי מודל — הסכמה א׳↔ב׳"
                value={`${(data.live.llmJudge.judgeAgreementRate * 100).toFixed(0)}%`}
                sub={`${data.live.llmJudge.total} זוגות נשפטו`}
              />
              <StatTile label="דילוג אוטומטי" value={String(data.live.llmJudge.autoSkipped)} sub="ביטחון גבוה + הסכמה" />
              <StatTile label="תור בעלים" value={String(data.live.llmJudge.needsOwner)} sub="מחלוקת / סף / ביקורת" />
              <StatTile
                label="ביקורת אדם (דגימה)"
                value={
                  data.live.llmJudge.humanAuditAgreementRate != null
                    ? `${(data.live.llmJudge.humanAuditAgreementRate * 100).toFixed(0)}%`
                    : "—"
                }
                sub={
                  data.live.llmJudge.humanAuditCompared > 0
                    ? `${data.live.llmJudge.humanAuditCompared} זוגות עם תיוג אדם`
                    : "ממתין לתיוג על דגימת ביקורת"
                }
              />
            </section>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,340px)]">
            <div className="rounded-3xl border border-[var(--stroke)] bg-white/90 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-[var(--hero)]">מפת רכיבים</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">לחצו על רכיב לפרטים — קווים מציגים זרימת נתונים עיקרית.</p>
              <ArchitectureDiagram
                layout={NODE_LAYOUT}
                nodes={data.nodes}
                edges={ARCHITECTURE_EDGES}
                selectedId={selectedId}
                flowHighlight={autoPlay ? flowHighlight : undefined}
                onSelect={(id) => {
                  setSelectedId(id);
                  setTechOpen(false);
                }}
              />
            </div>

            <aside
              className={`rounded-3xl border border-[var(--stroke)] bg-white/95 p-5 shadow-lg transition-all duration-300 ${
                selected ? "opacity-100 translate-x-0" : "opacity-60"
              }`}
            >
              {selected ? (
                <>
                  <h3 className="text-xl font-bold text-[var(--hero)]">{selected.titleHe}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">{selected.summaryHe}</p>
                  <NodeStatsList stats={nodeLive} />
                  <div className="mt-4 rounded-2xl bg-[var(--accent)]/8 p-4">
                    <p className="text-xs font-semibold text-[var(--accent)]">החלטת עיצוב</p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{selected.decisionHe}</p>
                  </div>
                  {selectedId === "matching" && data.live.eval.hybridNdcgAt5 != null ? (
                    <ul className="mt-4 space-y-1 text-sm text-[var(--muted)]">
                      <li>דירוג איכות@5 (אימון): {(data.live.eval.hybridNdcgAt5 * 100).toFixed(1)}%</li>
                      <li>כיסוי@5: {((data.live.eval.hybridRecallAt5 ?? 0) * 100).toFixed(1)}%</li>
                    </ul>
                  ) : null}
                  <button
                    type="button"
                    className="mt-4 text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                    onClick={() => setTechOpen((v) => !v)}
                  >
                    {techOpen ? "הסתר" : "הצג"} {T.technicalDetails}
                  </button>
                  {techOpen ? (
                    <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-slate-50 p-3 font-mono text-[11px] text-slate-700">
                      {selected.technicalPaths.map((p) => (
                        <li key={p} className="border-b border-slate-200/80 py-1 last:border-0">
                          {p}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-[var(--muted)]">בחרו רכיב במפה.</p>
              )}
            </aside>
          </section>

          <section className="rounded-3xl border border-[var(--stroke)] bg-white/90 p-5 sm:p-7">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(data.flows) as (keyof Payload["flows"])[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFlowKey(key);
                    setFlowStep(0);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    flowKey === key ? "bg-[var(--hero)] text-white" : "bg-[var(--chip)] text-[var(--ink)] hover:bg-[var(--accent)]/15"
                  }`}
                >
                  {data.flows[key].titleHe}
                </button>
              ))}
            </div>
            {flow ? (
              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--hero)]">{flow.titleHe}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-1 text-sm font-medium ${
                        autoPlay ? "bg-[var(--accent)] text-white" : "border border-[var(--stroke)]"
                      }`}
                      onClick={() => setAutoPlay((v) => !v)}
                    >
                      {autoPlay ? "עצור הדגמה" : "הדגמה אוטומטית"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--stroke)] px-3 py-1 text-sm disabled:opacity-40"
                      disabled={flowStep <= 0}
                      onClick={() => setFlowStep((s) => Math.max(0, s - 1))}
                    >
                      הקודם
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--stroke)] px-3 py-1 text-sm disabled:opacity-40"
                      disabled={flowStep >= flow.steps.length - 1}
                      onClick={() => setFlowStep((s) => Math.min(flow.steps.length - 1, s + 1))}
                    >
                      הבא
                    </button>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--chip)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out"
                    style={{ width: `${flowProgress * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  שלב {flowStep + 1} מתוך {flow.steps.length}
                  {flowKey === "matchPipeline" ? " — צבע «קוד» מול «מודל» בכל שלב" : null}
                </p>
                <ol className="mt-6 space-y-3">
                  {flow.steps.map((step, i) => {
                    const active = i === flowStep;
                    const badge = kindBadge(step.kind);
                    return (
                      <li
                        key={step.titleHe}
                        className={`rounded-2xl border p-4 transition-all duration-300 ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-sm scale-[1.01]"
                            : "border-transparent bg-[var(--chip)]/50 opacity-70"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[var(--muted)]">{i + 1}.</span>
                          <span className="font-semibold text-[var(--hero)]">{step.titleHe}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        {active ? <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{step.bodyHe}</p> : null}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-[var(--stroke)] bg-white/90 p-6">
              <h3 className="text-lg font-semibold text-[var(--hero)]">
                {T.matchingEngine} — {T.calibration}
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-[var(--stroke)] pb-2">
                  <dt className="text-[var(--muted)]">משקל ייצוג וקטורי</dt>
                  <dd className="font-semibold">{data.live.matching.semanticWeight.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-[var(--stroke)] pb-2">
                  <dt className="text-[var(--muted)]">משקל כללים</dt>
                  <dd className="font-semibold">{data.live.matching.ruleWeight.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-[var(--stroke)] pb-2">
                  <dt className="text-[var(--muted)]">רצפת דמיון</dt>
                  <dd className="font-semibold">{data.live.matching.cosineFloor.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">
                    {T.threshold} ל{T.queue}
                  </dt>
                  <dd className="font-semibold">{data.live.matching.queueThreshold.toFixed(2)}</dd>
                </div>
              </dl>
              {data.live.eval.hybridNdcgAt5 != null ? (
                <p className="mt-4 text-sm text-[var(--muted)]">
                  מדדי הערכה (אימון): דיוק@5 {(data.live.eval.hybridPrecisionAt5! * 100).toFixed(1)}% · כיסוי@5{" "}
                  {((data.live.eval.hybridRecallAt5 ?? 0) * 100).toFixed(1)}%
                </p>
              ) : null}
              <Link href={data.live.sandboxReportLink} className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline">
                דוח הרצה — נתוני בדיקה →
              </Link>
            </div>

            <div className="rounded-3xl border border-[var(--stroke)] bg-white/90 p-6">
              <h3 className="text-lg font-semibold text-[var(--hero)]">בטיחות AI</h3>
              <ul className="mt-4 space-y-4">
                {data.safety.map((s) => (
                  <li key={s.titleHe} className="rounded-2xl bg-[var(--chip)]/60 p-4">
                    <p className="font-semibold text-[var(--hero)]">{s.titleHe}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]">{s.bodyHe}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-[var(--hero)]">דילמות הנדסיות</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {data.dilemmas.map((d) => (
                <article
                  key={d.titleHe}
                  className="rounded-3xl border border-[var(--stroke)] bg-white/90 p-5 transition hover:shadow-md"
                >
                  <h4 className="font-bold text-[var(--hero)]">{d.titleHe}</h4>
                  <p className="mt-2 text-xs text-[var(--muted)]">אפשרויות: {d.optionsHe.join(" · ")}</p>
                  <p className="mt-3 text-sm">
                    <span className="font-semibold text-[var(--accent)]">נבחר: </span>
                    {d.choiceHe}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{d.whyHe}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">טוען ארכיטקטורה…</p>
      )}
    </div>
  );
}
