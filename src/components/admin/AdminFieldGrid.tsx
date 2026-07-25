function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function AdminFieldGrid(props: { card: Record<string, unknown> }) {
  const entries = Object.entries(props.card).filter(([key]) => key !== "extras");
  const extras = props.card.extras;
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-xl bg-[var(--chip)]/40 px-3 py-2">
          <dt className="text-[11px] font-medium text-[var(--muted)]">{key}</dt>
          <dd className="mt-0.5 text-sm text-[var(--ink)] break-words">{formatValue(value)}</dd>
        </div>
      ))}
      {extras && typeof extras === "object" && !Array.isArray(extras)
        ? Object.entries(extras as Record<string, unknown>).map(([key, value]) => (
            <div key={`extra-${key}`} className="rounded-xl bg-[var(--chip)]/40 px-3 py-2">
              <dt className="text-[11px] font-medium text-[var(--muted)]">extras.{key}</dt>
              <dd className="mt-0.5 text-sm text-[var(--ink)] break-words">{formatValue(value)}</dd>
            </div>
          ))
        : null}
    </dl>
  );
}
