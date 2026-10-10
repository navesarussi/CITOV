"use client";

import {
  JOURNEY_EDGES,
  JOURNEY_KIND_COLORS,
  JOURNEY_KIND_LABELS,
  JOURNEY_LANE_BANDS,
  JOURNEY_LANE_LABELS,
  JOURNEY_NODES,
  JOURNEY_STEP_ORDER,
  JOURNEY_VIEWBOX,
  journeyNodeById,
  type JourneyKind,
  type JourneyNode,
} from "@/domain/admin-e2e-journey-content";
import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

function nodeCenter(n: JourneyNode): { x: number; y: number } {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

function KindLegend() {
  const items: JourneyKind[] = ["code", "model", "human", "both"];
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {items.map((k) => (
        <span
          key={k}
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
          style={{
            background: JOURNEY_KIND_COLORS[k].fill,
            borderColor: JOURNEY_KIND_COLORS[k].stroke,
          }}
        >
          {JOURNEY_KIND_LABELS[k]}
        </span>
      ))}
    </div>
  );
}

function DetailPanel(props: { node: JourneyNode | null; onClose: () => void }) {
  if (!props.node) return null;
  const colors = JOURNEY_KIND_COLORS[props.node.kind];
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      onClick={props.onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[var(--stroke)] bg-white p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--muted)]">
              {JOURNEY_LANE_LABELS[props.node.lane]} · {JOURNEY_KIND_LABELS[props.node.kind]}
            </p>
            <h3 className="text-lg font-bold text-[var(--hero)]">{props.node.titleHe}</h3>
          </div>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-xl border border-[var(--stroke)] px-3 text-sm"
            onClick={props.onClose}
          >
            סגירה
          </button>
        </div>
        <div
          className="rounded-2xl border p-4 text-sm leading-relaxed text-[var(--ink)]"
          style={{ background: colors.fill, borderColor: colors.stroke }}
        >
          {props.node.summaryHe}
        </div>
      </div>
    </div>
  );
}

function MobileStepper(props: { selectedId: string | null; onSelect: (id: string) => void }) {
  const ordered = useMemo(
    () =>
      JOURNEY_STEP_ORDER.map((id) => journeyNodeById(id)).filter((n): n is JourneyNode => Boolean(n)),
    [],
  );
  return (
    <ol className="space-y-2 md:hidden">
      {ordered.map((node, i) => {
        const active = props.selectedId === node.id;
        const colors = JOURNEY_KIND_COLORS[node.kind];
        return (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => props.onSelect(node.id)}
              className={`flex w-full min-h-10 items-start gap-2 rounded-xl border p-2.5 text-right transition ${
                active ? "border-[var(--accent)] shadow-md" : "border-[var(--stroke)] bg-white/90"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--chip)] text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-[10px] text-[var(--muted)]">
                  {JOURNEY_LANE_LABELS[node.lane]} · {JOURNEY_KIND_LABELS[node.kind]}
                </span>
                <span className="mt-0.5 block font-semibold text-[var(--hero)]">{node.titleHe}</span>
              </span>
              <span
                className="mt-1 h-3 w-3 shrink-0 rounded-full border"
                style={{ background: colors.fill, borderColor: colors.stroke }}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function EndToEndJourneyMap() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.42);
  const [pan, setPan] = useState({ x: 24, y: 8 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const selected = selectedId ? (journeyNodeById(selectedId) ?? null) : null;

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-journey-node]")) return;
      drag.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan.x, pan.y],
  );

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.ox + (e.clientX - drag.current.px),
      y: drag.current.oy + (e.clientY - drag.current.py),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const nodeMap = useMemo(() => new Map(JOURNEY_NODES.map((n) => [n.id, n])), []);

  return (
    <section className="rounded-2xl border border-[var(--stroke)] bg-gradient-to-b from-white to-[var(--accent)]/5 p-3 sm:rounded-3xl sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2 sm:gap-3">
        <div>
          <h3 className="text-base font-bold text-[var(--hero)] sm:text-xl">מסע מוצר מקצה לקצה</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
            מהתחברות Google ועד כיול מחדש — כולל צדדי ניטור, תקציב, חוסן ופרטיות. לחצו על תיבה לפרטים.
            גררו לתזוזה; +/- להגדלה. במובייל: רשימת שלבים אנכית.
          </p>
        </div>
        <KindLegend />
      </header>

      <MobileStepper selectedId={selectedId} onSelect={setSelectedId} />

      <div className="relative mt-4 hidden overflow-hidden rounded-2xl border border-[var(--stroke)] bg-slate-50/80 md:block">
        <div className="absolute left-3 top-3 z-10 flex gap-2">
          <button
            type="button"
            className="min-h-10 min-w-10 rounded-lg border border-[var(--stroke)] bg-white text-lg font-bold shadow-sm"
            onClick={() => setScale((s) => Math.min(1.2, s + 0.08))}
            aria-label="הגדלה"
          >
            +
          </button>
          <button
            type="button"
            className="min-h-10 min-w-10 rounded-lg border border-[var(--stroke)] bg-white text-lg font-bold shadow-sm"
            onClick={() => setScale((s) => Math.max(0.22, s - 0.08))}
            aria-label="הקטנה"
          >
            −
          </button>
          <button
            type="button"
            className="min-h-10 rounded-lg border border-[var(--stroke)] bg-white px-3 text-xs shadow-sm"
            onClick={() => {
              setScale(0.42);
              setPan({ x: 24, y: 8 });
            }}
          >
            איפוס תצוגה
          </button>
        </div>
        <div
          className="h-[min(72vh,640px)] w-full cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${JOURNEY_VIEWBOX.w} ${JOURNEY_VIEWBOX.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "0 0",
            }}
          >
            {JOURNEY_LANE_BANDS.map((band) => (
              <g key={band.lane}>
                <rect
                  x={16}
                  y={band.y}
                  width={JOURNEY_VIEWBOX.w - 32}
                  height={band.h}
                  rx={12}
                  fill="white"
                  fillOpacity={0.55}
                  stroke="#e2e8f0"
                />
                <text
                  x={JOURNEY_VIEWBOX.w - 40}
                  y={band.y + 28}
                  textAnchor="end"
                  className="fill-slate-500 text-[22px] font-bold"
                >
                  {JOURNEY_LANE_LABELS[band.lane]}
                </text>
              </g>
            ))}

            <defs>
              <marker id="journey-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#64748b" />
              </marker>
            </defs>

            {JOURNEY_EDGES.map((edge) => {
              const a = nodeMap.get(edge.from);
              const b = nodeMap.get(edge.to);
              if (!a || !b) return null;
              const ca = nodeCenter(a);
              const cb = nodeCenter(b);
              const mx = (ca.x + cb.x) / 2;
              const my = (ca.y + cb.y) / 2;
              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <line
                    x1={ca.x}
                    y1={ca.y}
                    x2={cb.x}
                    y2={cb.y}
                    stroke="#94a3b8"
                    strokeWidth={edge.dashed ? 2 : 2.5}
                    strokeDasharray={edge.dashed ? "8 6" : undefined}
                    markerEnd="url(#journey-arrow)"
                  />
                  {edge.labelHe ? (
                    <text x={mx} y={my - 6} textAnchor="middle" className="fill-slate-600 text-[14px]">
                      {edge.labelHe}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {JOURNEY_NODES.map((node) => {
              const colors = JOURNEY_KIND_COLORS[node.kind];
              const active = selectedId === node.id;
              return (
                <g
                  key={node.id}
                  data-journey-node
                  className="cursor-pointer"
                  onClick={() => setSelectedId(node.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedId(node.id);
                  }}
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.w}
                    height={node.h}
                    rx={10}
                    fill={colors.fill}
                    stroke={active ? "#2563eb" : colors.stroke}
                    strokeWidth={active ? 3 : 1.5}
                  />
                  <text
                    x={node.x + node.w / 2}
                    y={node.y + node.h / 2 + 5}
                    textAnchor="middle"
                    className="fill-slate-900 text-[15px] font-semibold"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.titleHe.length > 22 ? `${node.titleHe.slice(0, 20)}…` : node.titleHe}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {selected ? (
        <div className="mt-4 hidden rounded-2xl border border-[var(--stroke)] bg-white/95 p-4 md:block">
          <p className="text-xs text-[var(--muted)]">
            {JOURNEY_LANE_LABELS[selected.lane]} · {JOURNEY_KIND_LABELS[selected.kind]}
          </p>
          <p className="mt-1 font-bold text-[var(--hero)]">{selected.titleHe}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{selected.summaryHe}</p>
        </div>
      ) : null}

      <div className="md:hidden">
        <DetailPanel node={selected} onClose={() => setSelectedId(null)} />
      </div>
    </section>
  );
}
