import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "default" | "compact";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--hero)] text-white shadow-[0_10px_24px_rgba(16,42,80,0.22)] hover:bg-[var(--accent-strong)] active:scale-[0.98]",
  secondary:
    "border border-[var(--stroke)] bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]",
  ghost: "text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--ink)] active:scale-[0.98]",
  danger: "text-[var(--warn)] hover:bg-[var(--warn-bg)] active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  default: "min-h-11 px-4 py-2.5 text-sm",
  compact: "min-h-8 px-3 py-1.5 text-[var(--text-xs)] sm:min-h-9 sm:text-sm",
};

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size },
) {
  const { variant = "primary", size = "default", className = "", ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--control-radius)] font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
    />
  );
}
