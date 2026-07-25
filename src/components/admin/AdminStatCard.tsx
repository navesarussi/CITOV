export function AdminStatCard(props: {
  label: string;
  value: string | number;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel rounded-[var(--panel-radius)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]">
      <p className="text-sm text-[var(--muted)]">{props.label}</p>
      <p className="mt-1 text-3xl font-bold text-[var(--hero)]">{props.value}</p>
      {props.sub ? <p className="mt-1 text-xs text-[var(--muted)]">{props.sub}</p> : null}
      {props.children}
    </div>
  );
}
