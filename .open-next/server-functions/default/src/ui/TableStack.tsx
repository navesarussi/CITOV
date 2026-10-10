import { cn } from "./cn";

export type StackRow = {
  id: string;
  primary: string;
  secondary?: string;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
};

export function TableStack(props: { rows: StackRow[]; empty?: React.ReactNode; className?: string }) {
  if (props.rows.length === 0) return props.empty ?? null;
  return (
    <ul className={cn("divide-y divide-[var(--stroke)] rounded-[var(--radius-lg)] border border-[var(--stroke)] bg-[var(--surface)]", props.className)}>
      {props.rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={row.onClick}
            disabled={!row.onClick}
            className={cn(
              "flex w-full items-start gap-2 px-2.5 py-2 text-start sm:gap-3 sm:px-3 sm:py-2.5",
              row.onClick && "hover:bg-[var(--chip)]/60",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[var(--text-xs)] font-medium text-[var(--ink)] sm:text-sm">{row.primary}</p>
              {row.secondary ? (
                <p className="mt-0.5 line-clamp-2 text-[10px] text-[var(--muted)] sm:text-xs">{row.secondary}</p>
              ) : null}
              {row.meta ? <div className="mt-1">{row.meta}</div> : null}
            </div>
            {row.trailing ? <div className="shrink-0 text-[10px] sm:text-xs">{row.trailing}</div> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
