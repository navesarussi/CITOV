import { cn } from "./cn";
import { Card } from "./Card";

export function StatCard(props: {
  label: string;
  value: string | number;
  sub?: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Card compact={props.compact ?? true} className={cn("transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]", props.className)}>
      <p className="text-[var(--text-xs)] leading-tight text-[var(--muted)] sm:text-[var(--text-sm)]">{props.label}</p>
      <p className="mt-0.5 text-xl font-bold text-[var(--hero)] sm:mt-1 sm:text-2xl lg:text-3xl">{props.value}</p>
      {props.sub ? (
        <p className="mt-0.5 text-[10px] leading-snug text-[var(--muted)] sm:text-xs">{props.sub}</p>
      ) : null}
      {props.children}
    </Card>
  );
}
