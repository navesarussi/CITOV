"use client";

export function ScoreBar(props: {
  value: number;
  max?: number;
  className?: string;
  tone?: "accent" | "warn" | "muted";
}) {
  const max = props.max ?? 1;
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (props.value / max) * 100));
  const fill =
    props.tone === "warn"
      ? "bg-[var(--warn)]"
      : props.tone === "muted"
        ? "bg-[var(--muted)]"
        : "bg-[var(--accent)]";
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-[var(--chip)] ${props.className ?? ""}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full transition-[width] duration-300 ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
