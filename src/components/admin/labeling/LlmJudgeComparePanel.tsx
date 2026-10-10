"use client";

import type { LlmJudgePairRecord } from "@/domain/llm-judge";
import type { SandboxLlmJudgmentRow } from "@/infrastructure/db/sandbox-llm-judgments";

type JudgeRow = LlmJudgePairRecord | SandboxLlmJudgmentRow;

const labelHe: Record<string, string> = {
  good: "מתאים",
  acceptable: "סביר",
  bad: "לא מתאים",
};

export function LlmJudgeComparePanel(props: {
  judge: JudgeRow | null | undefined;
  compact?: boolean;
  /** Holdout: suggestions only; owner label is truth */
  suggestion?: boolean;
}) {
  const j = props.judge;
  if (!j) {
    return (
      <p
        className={`rounded-xl border border-dashed border-[var(--stroke)] bg-white/60 text-[var(--muted)] ${
          props.compact ? "p-2.5 text-xs" : "rounded-2xl p-4 text-sm"
        }`}
      >
        {props.suggestion
          ? "אין הצעת שופט לזוג זה — תייגו לפי שיקול דעתכם."
          : "אין עדיין שיפוט מודל לזוג הזה — הריצו seed + שיפוט מדוח ארגז הבדיקות."}
      </p>
    );
  }

  const inner = (
    <div className={`space-y-3 ${props.compact ? "text-xs" : ""}`}>
      {props.suggestion ? (
        <p className="text-[10px] leading-snug text-[var(--muted)]">
          הצעות שופטי מודל (קפואות) — התיוג שלכם הוא מקור האמת.
        </p>
      ) : null}
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          j.judgesAgree
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-amber-300 bg-amber-50 text-amber-950"
        }`}
      >
        {j.judgesAgree ? (
          <p>
            <strong>הסכמה בין השופטים</strong>
            {j.autoSkipped ? " — דולג מתור הבעלים (ביטחון גבוה)." : " — עדיין בתור לבעלים (ביקורת/מנוע/סף)."}
          </p>
        ) : (
          <p>
            <strong>מחלוקת בין השופטים</strong> — נדרשת החלטת בעלים; שני הנימוקים למטה.
          </p>
        )}
      </div>

      <section className={`grid gap-2 ${props.compact ? "" : "md:grid-cols-2 gap-3"}`}>
        <article className={`rounded-xl border border-[var(--stroke)] bg-white/90 ${props.compact ? "p-2.5" : "rounded-2xl p-4"}`}>
          <p className="text-[10px] font-semibold text-[var(--muted)]">שופט א׳</p>
          <p className={`mt-0.5 font-bold text-[var(--hero)] ${props.compact ? "text-sm" : "text-lg"}`}>
            {labelHe[j.judgeA.label] ?? j.judgeA.label}
          </p>
          <p className={`mt-1 leading-relaxed ${props.compact ? "text-xs" : "text-sm"}`}>{j.judgeA.reasonHe}</p>
          <p className="mt-1 text-[10px] text-[var(--muted)]">ביטחון: {(j.judgeA.confidence * 100).toFixed(0)}%</p>
        </article>
        <article
          className={`rounded-xl border bg-white/90 ${props.compact ? "p-2.5" : "rounded-2xl p-4"} ${
            j.judgesAgree ? "border-[var(--stroke)]" : "border-amber-400 ring-1 ring-amber-200"
          }`}
        >
          <p className="text-[10px] font-semibold text-[var(--muted)]">שופט ב׳</p>
          <p className={`mt-0.5 font-bold text-[var(--hero)] ${props.compact ? "text-sm" : "text-lg"}`}>
            {labelHe[j.judgeB.label] ?? j.judgeB.label}
          </p>
          <p className={`mt-1 leading-relaxed ${props.compact ? "text-xs" : "text-sm"}`}>{j.judgeB.reasonHe}</p>
          <p className={`mt-1 font-medium leading-relaxed text-[var(--accent)] ${props.compact ? "text-xs" : "text-sm"}`}>
            ביקורת: {j.judgeB.critiqueHe}
          </p>
          <p className="mt-1 text-[10px] text-[var(--muted)]">ביטחון: {(j.judgeB.confidence * 100).toFixed(0)}%</p>
        </article>
      </section>
    </div>
  );

  if (props.compact) {
    return (
      <details className="rounded-xl border border-[var(--stroke)] bg-white/80 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-[var(--hero)]">שופטי מודל — הצעות</summary>
        <div className="mt-2">{inner}</div>
      </details>
    );
  }

  return inner;
}
