"use client";

import { cn } from "./cn";

export function Drawer(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: "end" | "bottom";
}) {
  if (!props.open) return null;
  const side = props.side ?? "end";
  return (
    <div className="fixed inset-0 z-[var(--z-drawer)] flex" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-[var(--bg-deep)]/40"
        aria-label="סגירה"
        onClick={props.onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[92dvh] flex-col bg-[var(--surface-elevated)] shadow-[var(--shadow-md)]",
          side === "end"
            ? "ms-auto h-full w-full max-w-md border-s border-[var(--stroke)]"
            : "mt-auto h-auto max-h-[85dvh] w-full rounded-t-[var(--panel-radius)] border-t border-[var(--stroke)]",
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--stroke)] px-3 py-2 sm:px-4 sm:py-3">
          <h3 className="text-[var(--text-sm)] font-semibold text-[var(--hero)] sm:text-base">{props.title}</h3>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-[var(--radius-md)] px-2 py-1 text-[var(--text-xs)] text-[var(--muted)] hover:bg-[var(--chip)]"
          >
            סגור
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">{props.children}</div>
      </div>
    </div>
  );
}
