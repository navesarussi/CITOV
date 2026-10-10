"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/Button";

type Row = {
  userId: string;
  name: string;
  email: string | null;
  jobCount: number;
  avgUserMessages: number;
  avgKnowledgePercent: number;
};

export default function AdminEmployersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/admin/employers", { signal: controller.signal });
      clearTimeout(timer);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "שגיאה בטעינה");
        return;
      }
      setRows(json.employers ?? []);
      setError(null);
    } catch {
      setError("הטעינה ארכה מדי או נכשלה.");
    } finally {
      setLoading(false);
    }
  }, []);

  useDeferredEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title="מעסיקים"
      subtitle="דפדפן כרטיסים — קריאה בלבד"
      actions={
        <Button variant="secondary" onClick={() => void load()} className="min-h-9 px-3 py-1.5 text-sm">
          רענון
        </Button>
      }
    >
      <p className="mb-4 text-sm">
        <Link href="/admin" className="text-[var(--accent)] hover:underline">
          ← חזרה לפורטל
        </Link>
      </p>
      {error ? (
        <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
      ) : null}
      {loading ? <p className="text-sm text-[var(--muted)]">טוען…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">אין מעסיקים.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.userId}>
              <Link
                href={`/admin/employers/${r.userId}`}
                className="panel flex flex-wrap items-center justify-between gap-3 rounded-[var(--panel-radius)] p-4 transition hover:border-[var(--accent)]"
              >
                <span>
                  <span className="font-semibold text-[var(--hero)]">{r.name}</span>
                  {r.email ? <span className="ms-2 text-xs text-[var(--muted)]">{r.email}</span> : null}
                </span>
                <span className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                  <span>{r.jobCount} משרות</span>
                  <span>ממוצע הודעות {r.avgUserMessages.toFixed(1)}</span>
                  <span>ידע {Math.round(r.avgKnowledgePercent)}%</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
