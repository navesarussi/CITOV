"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import { Button } from "@/components/ui/Button";
import type { PromptDefinition } from "@/domain/prompt-registry";

type CatalogCard = {
  id: string;
  nameHe: string;
  purposeHe: string;
  whenSentHe: string;
  category: PromptDefinition["category"];
  supportsEval: boolean;
  activeVersion: number | null;
  updatedAt: string | null;
  updatedBy: string | null;
  isCustom: boolean;
};

type VersionRow = {
  version: number;
  createdAt: string;
  createdBy: string | null;
  body: string;
};

type CatalogDetail = {
  definition: PromptDefinition;
  activeBody: string;
  defaultBody: string;
  activeVersion: number | null;
  updatedAt: string | null;
  updatedBy: string | null;
  versions: VersionRow[];
};

const CATEGORY_HE: Record<PromptDefinition["category"], string> = {
  chat: "שיחה",
  extraction: "חילוץ מידע",
  matching: "התאמה",
  translation: "תרגום",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "ברירת מחדל";
  return new Date(iso).toLocaleString("he-IL");
}

function diffLines(a: string, b: string): { added: number; removed: number; sample: string[] } {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  let added = 0;
  let removed = 0;
  const sample: string[] = [];
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max; i++) {
    const al = aLines[i];
    const bl = bLines[i];
    if (al === bl) continue;
    if (al === undefined) {
      added++;
      if (sample.length < 8) sample.push(`+ ${bl}`);
    } else if (bl === undefined) {
      removed++;
      if (sample.length < 8) sample.push(`− ${al}`);
    } else {
      removed++;
      added++;
      if (sample.length < 8) {
        sample.push(`− ${al}`);
        sample.push(`+ ${bl}`);
      }
    }
  }
  return { added, removed, sample };
}

function highlightVariables(text: string, variables: PromptDefinition["variables"]): React.ReactNode[] {
  if (!variables.length) return [text];
  const keys = variables.map((v) => v.key).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(\\{\\{(${keys.join("|")})\\}\\})`, "g");
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    const varDef = variables.find((v) => part === `{{${v.key}}}`);
    if (varDef) {
      return (
        <mark
          key={`${part}-${i}`}
          title={`${varDef.labelHe} — ${varDef.descriptionHe}`}
          className="cursor-help rounded bg-[var(--accent)]/15 px-1 font-mono text-[var(--hero)]"
        >
          {part}
        </mark>
      );
    }
    return <span key={`t-${i}`}>{part}</span>;
  });
}

export function AdminPromptStudio() {
  const [catalog, setCatalog] = useState<CatalogCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CatalogDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);
  const [evalRunning, setEvalRunning] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/prompt-catalog");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "שגיאה בטעינה");
        return;
      }
      setCatalog(json.catalog ?? []);
      setError(null);
    } catch {
      setError("לא ניתן לטעון את רשימת הפרומפטים");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setEvalResult(null);
    try {
      const res = await fetch(`/api/admin/prompt-catalog?id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "שגיאה בטעינת פרומפט");
        return;
      }
      const d = json.detail as CatalogDetail;
      setDetail(d);
      setDraft(d.activeBody);
      setError(null);
    } catch {
      setError("טעינת הפרומפט נכשלה");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useDeferredEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useDeferredEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDraft("");
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const previousBody = useMemo(() => {
    if (!detail?.versions.length) return detail?.defaultBody ?? "";
    const prev = detail.versions.find((v) => v.version === (detail.activeVersion ?? 0) - 1);
    if (prev) return prev.body;
    const oldest = detail.versions[detail.versions.length - 1];
    return oldest?.body ?? detail.defaultBody;
  }, [detail]);

  const diffVsPrevious = useMemo(() => diffLines(previousBody, draft), [previousBody, draft]);

  const localPreview = useMemo(() => {
    if (!detail) return "";
    let out = draft;
    for (const v of detail.definition.variables) {
      const sample =
        v.key === "known_facts"
          ? "תפקיד: מלצר · חיפה"
          : v.key === "current_card"
            ? "{ … כרטיס לדוגמה … }"
            : v.key === "fields"
              ? '{ "desiredRole": "…" }'
              : v.key === "targetLocale"
                ? "he"
                : "…";
      out = out.split(`{{${v.key}}}`).join(sample);
    }
    return out;
  }, [draft, detail]);

  async function saveVersion() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/prompt-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", promptKey: selectedId, text: draft }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "שגיאה בשמירה");
        return;
      }
      if (json.detail) {
        setDetail(json.detail);
        setDraft(json.detail.activeBody);
      }
      await loadCatalog();
      setConfirmSave(false);
      setError(null);
    } finally {
      setSaving(false);
    }
  }

  async function rollback(version: number) {
    if (!selectedId || !confirm(`להחזיר לגרסה ${version}?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/prompt-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rollback", promptKey: selectedId, version }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "שגיאה בשחזור");
        return;
      }
      if (json.detail) {
        setDetail(json.detail);
        setDraft(json.detail.activeBody);
      }
      await loadCatalog();
    } finally {
      setSaving(false);
    }
  }

  async function runEval() {
    if (!selectedId) return;
    setEvalRunning(true);
    setEvalResult(null);
    try {
      const res = await fetch("/api/admin/prompt-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "eval", promptKey: selectedId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEvalResult(json.error ?? "ההערכה נכשלה");
        return;
      }
      const e = json.eval as {
        precisionAt5: number;
        recallAt5: number;
        ndcgAt5: number;
        goodMissed: number;
        badQueued: number;
        noteHe: string;
      };
      setEvalResult(
        `${e.noteHe} · דיוק@${5}: ${(e.precisionAt5 * 100).toFixed(1)}% · Recall: ${(e.recallAt5 * 100).toFixed(1)}% · nDCG: ${e.ndcgAt5.toFixed(3)} · החמצות טובות: ${e.goodMissed} · בתור שלא צריך: ${e.badQueued}`,
      );
    } finally {
      setEvalRunning(false);
    }
  }

  const dirty = detail ? draft.trim() !== detail.activeBody.trim() : false;

  return (
    <div className="space-y-6 pb-10">
      {error ? (
        <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">טוען פרומפטים…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {catalog.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedId(card.id)}
              className={`panel rounded-[var(--panel-radius)] p-4 text-start transition ${
                selectedId === card.id ? "ring-2 ring-[var(--accent)]" : "hover:border-[var(--accent)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-[var(--hero)]">{card.nameHe}</h2>
                <span className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-xs text-[var(--muted)]">
                  {CATEGORY_HE[card.category]}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--ink)]">{card.purposeHe}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                <span className="font-medium">מתי נשלח:</span> {card.whenSentHe}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span>
                  גרסה: {card.activeVersion != null ? card.activeVersion : "ברירת מחדל"}
                  {card.isCustom ? " · מותאם" : ""}
                </span>
                <span>· עודכן: {formatWhen(card.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedId ? (
        <section className="panel space-y-4 rounded-[var(--panel-radius)] p-5">
          {detailLoading || !detail ? (
            <p className="text-sm text-[var(--muted)]">טוען עורך…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--hero)]">{detail.definition.nameHe}</h3>
                  <p className="text-xs text-[var(--muted)]">
                    גרסה פעילה: {detail.activeVersion ?? "ברירת מחדל"} · {formatWhen(detail.updatedAt)}
                    {detail.updatedBy ? ` · ${detail.updatedBy}` : ""}
                  </p>
                </div>
                <Button variant="secondary" type="button" onClick={() => setSelectedId(null)}>
                  סגירה
                </Button>
              </div>

              {detail.definition.variables.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detail.definition.variables.map((v) => (
                    <span
                      key={v.key}
                      title={`${v.labelHe} — ${v.descriptionHe}`}
                      className="cursor-help rounded-full border border-[var(--stroke)] bg-white px-2.5 py-1 text-xs font-mono"
                    >
                      {`{{${v.key}}}`}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--stroke)] bg-white/80 p-3">
                  <p className="mb-2 text-xs font-semibold text-[var(--muted)]">עריכה</p>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    dir="rtl"
                    rows={20}
                    spellCheck={false}
                    className="max-h-[480px] w-full overflow-auto rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3 font-mono text-xs leading-6 outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-[var(--stroke)] bg-white/80 p-3">
                    <p className="mb-2 text-xs font-semibold text-[var(--muted)]">תצוגה מקדימה (נתוני דוגמה)</p>
                    <pre
                      className="max-h-[220px] overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3 text-xs leading-6"
                      dir="rtl"
                    >
                      {highlightVariables(localPreview, detail.definition.variables)}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-[var(--stroke)] bg-white/80 p-3">
                    <p className="mb-2 text-xs font-semibold text-[var(--muted)]">השוואה לגרסה קודמת</p>
                    <p className="text-xs text-[var(--muted)]">
                      {diffVsPrevious.added + diffVsPrevious.removed === 0
                        ? "אין שינוי מול הגרסה הקודמת"
                        : `${diffVsPrevious.added} שורות נוספו · ${diffVsPrevious.removed} הוסרו`}
                    </p>
                    {diffVsPrevious.sample.length > 0 ? (
                      <pre className="mt-2 max-h-[140px] overflow-auto font-mono text-[10px] leading-5 text-[var(--ink)]">
                        {diffVsPrevious.sample.join("\n")}
                      </pre>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={saving || !dirty}
                  onClick={() => {
                    if (!confirmSave) {
                      setConfirmSave(true);
                      return;
                    }
                    void saveVersion();
                  }}
                >
                  {saving ? "שומר…" : confirmSave ? "אישור — שמירה כגרסה חדשה" : "שמירה כגרסה חדשה"}
                </Button>
                {detail.definition.supportsEval ? (
                  <Button variant="secondary" disabled={evalRunning} onClick={() => void runEval()}>
                    {evalRunning ? "מריץ הערכה…" : "הרצת הערכת התאמה"}
                  </Button>
                ) : null}
                {evalResult ? <p className="text-xs text-[var(--ink)]">{evalResult}</p> : null}
              </div>

              {detail.versions.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold text-[var(--muted)]">גרסאות קודמות</p>
                  <ul className="space-y-1 text-xs">
                    {detail.versions.map((v) => (
                      <li key={v.version} className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">v{v.version}</span>
                        <span className="text-[var(--muted)]">{formatWhen(v.createdAt)}</span>
                        {v.version === detail.activeVersion ? (
                          <span className="text-[var(--accent)]">פעיל</span>
                        ) : (
                          <button
                            type="button"
                            className="text-[var(--accent)] hover:underline"
                            onClick={() => void rollback(v.version)}
                          >
                            שחזור
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
