import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--hero)] text-white shadow-[0_10px_24px_rgba(16,42,80,0.22)] hover:bg-[var(--accent-strong)]",
  secondary:
    "border border-[var(--stroke)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
  ghost: "text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--ink)]",
  danger: "text-[var(--warn)] hover:bg-[var(--warn-bg)]",
};

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant },
) {
  const { variant = "primary", className = "", ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--control-radius)] px-4 py-2.5 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}
