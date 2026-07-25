"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/Button";

type Detail = {
  userId: string;
  name: string;
  email: string | null;
  jobCount: number;
  avgUserMessages: number;
  avgKnowledgePercent: number;
  jobs: {
    jobId: string;
    title: string;
    knowledgePercent: number;
    userMessageCount: number;
    flexibility: number;
  }[];
};

export default function AdminEmployerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/admin/employers/${id}`, { signal: controller.signal });
      clearTimeout(timer);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "שגיאה בטעינה");
        return;
      }
      setData(json.employer);
      setError(null);
    } catch {
      setError("הטעינה ארכה מדי או נכשלה.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title={data?.name ?? "מעסיק"}
      subtitle="מעסיק ומשרות — קריאה בלבד"
      actions={
        <Button variant="secondary" onClick={() => void load()} className="min-h-9 px-3 py-1.5 text-sm">
          רענון
        </Button>
      }
    >
      <p className="mb-4 text-sm">
        <Link href="/admin/employers" className="text-[var(--accent)] hover:underline">
          ← חזרה לרשימה
        </Link>
      </p>
      {error ? (
        <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
      ) : null}
      {!data && !error ? <p className="text-sm text-[var(--muted)]">טוען…</p> : null}
      {data ? (
        <div className="space-y-6">
          <section className="flex flex-wrap gap-3 text-sm">
            {data.email ? <span className="text-[var(--muted)]">{data.email}</span> : null}
            <span>{data.jobCount} משרות</span>
            <span>ממוצע הודעות {data.avgUserMessages.toFixed(1)}</span>
            <span>ממוצע ידע {Math.round(data.avgKnowledgePercent)}%</span>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">משרות</h2>
            <ul className="space-y-2">
              {data.jobs.map((j) => (
                <li key={j.jobId}>
                  <Link
                    href={`/admin/employers/${id}/jobs/${j.jobId}`}
                    className="panel flex flex-wrap items-center justify-between gap-3 rounded-[var(--panel-radius)] p-4 transition hover:border-[var(--accent)]"
                  >
                    <span className="font-semibold text-[var(--hero)]">{j.title}</span>
                    <span className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                      <span>ידע {j.knowledgePercent}%</span>
                      <span>{j.userMessageCount} הודעות</span>
                      <span>גמישות {j.flexibility}/10</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
