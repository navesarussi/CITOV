import { cn } from "./cn";

export function Skeleton(props: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-[var(--radius-md)] bg-[var(--stroke)]/40", props.className)}
      aria-hidden
    />
  );
}
