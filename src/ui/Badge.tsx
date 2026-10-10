import { cn } from "./cn";

type Tone = "neutral" | "accent" | "success" | "warn";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--chip)] text-[var(--muted)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  success: "bg-[var(--success-bg)] text-[var(--success)]",
  warn: "bg-[var(--warn-bg)] text-[var(--warn)]",
};

export function Badge(props: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-full)] px-2 py-0.5 text-[10px] font-medium sm:text-xs",
        tones[props.tone ?? "neutral"],
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}
