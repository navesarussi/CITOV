"use client";

import type { ArchitectureEdge, ArchitectureNode, ArchitectureNodeId } from "@/domain/admin-architecture-content";

const GRID_COLS = 3;
const GRID_ROWS = 4;

export type DiagramLayoutCell = { id: ArchitectureNodeId; col: number; row: number };

function cellCenter(col: number, row: number): { x: number; y: number } {
  const cellW = 100 / GRID_COLS;
  const cellH = 100 / GRID_ROWS;
  return { x: (col + 0.5) * cellW, y: (row + 0.5) * cellH };
}

export function ArchitectureDiagram(props: {
  layout: DiagramLayoutCell[];
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  selectedId: ArchitectureNodeId | null;
  flowHighlight?: ArchitectureNodeId[];
  onSelect: (id: ArchitectureNodeId) => void;
}) {
  const pos = new Map<ArchitectureNodeId, { x: number; y: number }>();
  for (const cell of props.layout) {
    pos.set(cell.id, cellCenter(cell.col, cell.row));
  }

  return (
    <div className="relative mt-6 aspect-[3/4] w-full max-w-xl mx-auto">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[var(--accent)]/35"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <marker id="arch-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>
        {props.edges.map((edge) => {
          const a = pos.get(edge.from);
          const b = pos.get(edge.to);
          if (!a || !b) return null;
          const hot =
            props.flowHighlight?.includes(edge.from) && props.flowHighlight?.includes(edge.to);
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="currentColor"
              strokeWidth={hot ? 0.55 : 0.35}
              strokeOpacity={hot ? 0.85 : 0.45}
              markerEnd="url(#arch-arrow)"
              className={hot ? "animate-pulse" : undefined}
            />
          );
        })}
      </svg>

      <div
        className="relative grid h-full w-full gap-3"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
      >
        {props.layout.map(({ id, col, row }) => {
          const node = props.nodes.find((n) => n.id === id);
          if (!node) return null;
          const active = props.selectedId === id;
          const inFlow = props.flowHighlight?.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => props.onSelect(id)}
              className={`relative z-10 rounded-2xl border px-3 py-4 text-right text-sm font-semibold transition duration-300 ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--hero)] shadow-md scale-[1.02]"
                  : inFlow
                    ? "border-[var(--accent)]/70 bg-[var(--accent)]/10 text-[var(--hero)]"
                    : "border-[var(--stroke)] bg-white hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5"
              }`}
              style={{ gridColumn: col + 1, gridRow: row + 1 }}
            >
              {node.titleHe}
            </button>
          );
        })}
      </div>
    </div>
  );
}
