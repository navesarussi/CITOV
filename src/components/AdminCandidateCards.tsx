"use client";

import { useCallback, useEffect, useState } from "react";
import { FullCandidateCard } from "@/components/FullCandidateCard";
import { Button } from "@/components/ui/Button";
import type { CandidateCard } from "@/domain/types";

type AdminCandidate = {
  userId: string;
  name: string;
  email: string | null;
  card: CandidateCard;
  hasCv: boolean;
};

/** Admin full-card inspector — all fields including sensitive ones. */
export function AdminCandidateCards() {
  const [items, setItems] = useState<AdminCandidate[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/candidates");
      const json = (await res.json()) as { candidates?: AdminCandidate[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "שגיאה בטעינת כרטיסים");
        return;
      }
      setItems(json.candidates ?? []);
      setError(null);
    } catch {
      setError("שגיאה בטעינת כרטיסים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="enter-delay-2 mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--hero)]">כרטיסי מועמדים (מלא)</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            תצוגת אדמין בלבד — כולל שכר, חולשות וקווים אדומים. לא מה שהמועמד או המעסיק רואים.
          </p>
        </div>
        <Button variant="secondary" disabled={loading} onClick={() => void load()} className="min-h-9 px-3 text-sm">
          {loading ? "טוען…" : "רענון כרטיסים"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
      ) : null}

      {items.length === 0 && !loading ? (
        <p className="text-sm text-[var(--muted)]">אין מועמדים עדיין.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const open = openId === item.userId;
            return (
              <li key={item.userId} className="panel rounded-[var(--panel-radius)] p-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-start"
                  onClick={() => setOpenId(open ? null : item.userId)}
                  aria-expanded={open}
                >
                  <span>
                    <span className="font-semibold text-[var(--hero)]">{item.name}</span>
                    {item.email ? (
                      <span className="ms-2 text-xs text-[var(--muted)]">{item.email}</span>
                    ) : null}
                    {item.hasCv ? (
                      <span className="ms-2 text-[10px] font-semibold text-[var(--accent)]">CV</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{open ? "הסתר" : "כרטיס מלא"}</span>
                </button>
                {open ? (
                  <div className="mt-4">
                    <FullCandidateCard name={item.name} card={item.card} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
