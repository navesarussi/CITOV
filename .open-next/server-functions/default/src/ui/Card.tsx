import { cn } from "./cn";

export function Card(props: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  compact?: boolean;
}) {
  const Tag = props.as ?? "div";
  return (
    <Tag
      className={cn(
        "panel border border-[var(--stroke)] bg-[var(--surface)] shadow-[var(--shadow-soft)]",
        props.compact ? "rounded-[var(--radius-lg)] p-3 sm:p-4" : "rounded-[var(--panel-radius)] p-4 sm:p-5",
        props.className,
      )}
    >
      {props.children}
    </Tag>
  );
}
