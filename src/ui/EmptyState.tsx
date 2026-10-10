export function EmptyState(props: { title: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--stroke)] bg-[var(--surface)]/60 px-4 py-8 text-center">
      <p className="text-[var(--text-sm)] font-medium text-[var(--ink)]">{props.title}</p>
      {props.hint ? <p className="mt-1 text-[10px] text-[var(--muted)] sm:text-xs">{props.hint}</p> : null}
    </div>
  );
}
