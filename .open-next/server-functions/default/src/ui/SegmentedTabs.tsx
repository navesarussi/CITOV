"use client";

import { cn } from "./cn";

export type SegmentedTab<T extends string> = { id: T; label: string };

export function SegmentedTabs<T extends string>(props: {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex flex-wrap gap-1 rounded-[var(--control-radius)] border border-[var(--stroke)] bg-[var(--surface)] p-0.5",
        props.className,
      )}
    >
      {props.tabs.map((tab) => {
        const active = tab.id === props.value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => props.onChange(tab.id)}
            className={cn(
              "rounded-[calc(var(--control-radius)-2px)] font-medium transition",
              props.compact
                ? "min-h-7 px-2 py-1 text-[10px] sm:min-h-8 sm:px-3 sm:text-xs"
                : "min-h-9 px-3 py-1.5 text-xs sm:text-sm",
              active
                ? "bg-[var(--hero)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--ink)]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
