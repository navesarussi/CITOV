"use client";

import type { SandboxLlmJudgmentRow } from "@/infrastructure/db/sandbox-llm-judgments";

const labelHe: Record<string, string> = {
  good: "מתאים",
  acceptable: "סביר",
  bad: "לא מתאים",
};

export function LlmJudgeComparePanel(props: { judge: SandboxLlmJudgmentRow | null | undefined }) {
  const j = props.judge;
  if (!j) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--stroke)] bg-white/60 p-4 text-sm text-[var(--muted)]">
        אין עדיין שיפוט AI לזוג הזה — הריצו seed + שיפוט מהדוח.
      </p>
    );
  }
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <article className="rounded-2xl border border-[var(--stroke)] bg-white/90 p-4">
        <p className="text-xs font-semibold text-[var(--muted)]">שופט א׳</p>
        <p className="mt-1 text-lg font-bold text-[var(--hero)]">{labelHe[j.judgeA.label] ?? j.judgeA.label}</p>
        <p className="mt-2 text-sm leading-relaxed">{j.judgeA.reasonHe}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">ביטחון: {(j.judgeA.confidence * 100).toFixed(0)}%</p>
      </article>
      <article className="rounded-2xl border border-[var(--stroke)] bg-white/90 p-4">
        <p className="text-xs font-semibold text-[var(--muted)]">שופט ב׳ (ביקורת על א׳)</p>
        <p className="mt-1 text-lg font-bold text-[var(--hero)]">{labelHe[j.judgeB.label] ?? j.judgeB.label}</p>
        <p className="mt-2 text-sm leading-relaxed">{j.judgeB.reasonHe}</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--accent)]">{j.judgeB.critiqueHe}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">ביטחון: {(j.judgeB.confidence * 100).toFixed(0)}%</p>
      </article>
    </section>
  );
}
