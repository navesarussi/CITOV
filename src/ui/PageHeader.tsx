export function PageHeader(props: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2 sm:mb-4">
      <div className="min-w-0">
        <h2 className="text-[var(--text-sm)] font-semibold text-[var(--hero)] sm:text-base">{props.title}</h2>
        {props.description ? (
          <p className="mt-0.5 text-[10px] text-[var(--muted)] sm:text-xs">{props.description}</p>
        ) : null}
      </div>
      {props.actions ? <div className="flex shrink-0 flex-wrap gap-1">{props.actions}</div> : null}
    </div>
  );
}
