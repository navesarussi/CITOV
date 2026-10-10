"use client";

import { useMemo, useState } from "react";
import { renderPromptTemplate } from "@/domain/admin";
import { emptyCandidateCard, emptyJobCard } from "@/domain/types";
import { Button } from "@/components/ui/Button";

const PLACEHOLDERS: { key: string; description: string }[] = [
  { key: "known_facts", description: "עובדות מוכרות מהכרטיס והשיחה" },
  { key: "current_card", description: "JSON מצומצם של הכרטיס הנוכחי" },
  { key: "missing_field_key", description: "שדה חסר הבא (פנימי)" },
  { key: "pending_field_questions", description: "שאלות תחום ממתינות" },
  { key: "recent_agent_questions", description: "שאלות שהסוכן כבר שאל" },
];

export function AdminPromptWorkbench(props: {
  candidatePrompt: string;
  employerPrompt: string;
  defaultCandidate: string;
  defaultEmployer: string;
  onCandidateChange: (v: string) => void;
  onEmployerChange: (v: string) => void;
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
  resetting: boolean;
  saved: boolean;
  updatedAt?: string;
  updatedBy?: string;
  isCustom: boolean;
}) {
  const [tab, setTab] = useState<"candidate" | "employer">("candidate");
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const active = tab === "candidate" ? props.candidatePrompt : props.employerPrompt;
  const defaultActive = tab === "candidate" ? props.defaultCandidate : props.defaultEmployer;
  const setActive = tab === "candidate" ? props.onCandidateChange : props.onEmployerChange;

  const preview = useMemo(() => {
    const card = tab === "candidate" ? emptyCandidateCard() : emptyJobCard();
    return renderPromptTemplate(active, {
      known_facts: tab === "candidate" ? "תפקיד: מלצר · חיפה" : "משרה: קופאי · תל אביב",
      current_card: JSON.stringify(card, null, 2).slice(0, 400),
      missing_field_key: tab === "candidate" ? "location (מיקום)" : "mustHaves (דרישות)",
      pending_field_questions: "- [q1] באיזה אזור נוח לך לעבוד?",
      recent_agent_questions: "- ספר/י על הניסיון האחרון",
    });
  }, [active, tab]);

  const diffLines = useMemo(() => {
    if (active === defaultActive) return 0;
    return active.split("\n").filter((l, i) => l !== defaultActive.split("\n")[i]).length;
  }, [active, defaultActive]);

  return (
    <section className="enter-delay-2 mt-8 space-y-4 rounded-[var(--panel-radius)] border border-[var(--stroke)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--hero)]">עורך פרומפטים</h2>
          <p className="text-xs text-[var(--muted)]">
            {props.isCustom ? "מקור: DB (מותאם)" : "מקור: קבצי ברירת מחדל"} · גרסת bundle בקוד
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm ${tab === "candidate" ? "bg-[var(--hero)] text-white" : "border border-[var(--stroke)]"}`}
            onClick={() => setTab("candidate")}
          >
            סוכן מועמדים
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm ${tab === "employer" ? "bg-[var(--hero)] text-white" : "border border-[var(--stroke)]"}`}
            onClick={() => setTab("employer")}
          >
            סוכן מעסיקים
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PLACEHOLDERS.map((p) => (
          <span
            key={p.key}
            title={p.description}
            className="cursor-help rounded-full border border-[var(--stroke)] bg-white px-2.5 py-1 text-xs font-mono"
          >
            {`{{${p.key}}}`}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--stroke)] bg-white/80 p-3">
          <p className="mb-2 text-xs font-semibold text-[var(--muted)]">עריכה (RTL)</p>
          <textarea
            value={active}
            onChange={(e) => setActive(e.target.value)}
            dir="rtl"
            rows={18}
            spellCheck={false}
            className="max-h-[420px] w-full overflow-auto rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3 font-mono text-xs leading-6 outline-none focus:border-[var(--accent)]"
          />
          <p className="mt-2 text-xs text-[var(--muted)]">
            {diffLines > 0 ? `${diffLines} שורות שונות מברירת המחדל` : "זהה לברירת מחדל"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--stroke)] bg-white/80 p-3">
          <p className="mb-2 text-xs font-semibold text-[var(--muted)]">תצוגה מקדימה (עם נתוני דוגמה)</p>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3 text-xs leading-6" dir="rtl">
            {preview}
          </pre>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={props.saving}
          onClick={() => {
            if (!confirmSave) {
              setConfirmSave(true);
              return;
            }
            setConfirmSave(false);
            props.onSave();
          }}
        >
          {props.saving ? "שומר…" : confirmSave ? "אישור שמירה לייב" : "שמירת פרומפטים (לייב)"}
        </Button>
        <Button
          variant="secondary"
          disabled={props.resetting}
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            setConfirmReset(false);
            props.onReset();
          }}
        >
          {props.resetting ? "מאפס…" : confirmReset ? "אישור איפוס" : "איפוס לברירת מחדל"}
        </Button>
        {props.saved ? <span className="text-sm text-[var(--accent)]">נשמר — פעיל מההודעה הבאה</span> : null}
        {props.updatedAt ? (
          <span className="text-xs text-[var(--muted)]">
            עודכן: {new Date(props.updatedAt).toLocaleString("he-IL")}
            {props.updatedBy ? ` · ${props.updatedBy}` : ""}
          </span>
        ) : null}
      </div>
    </section>
  );
}
