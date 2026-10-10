"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
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
    location: string;
    statusLabel: string;
    createdAt: string | null;
    matchCounts: { queued: number; approved: number; rejected: number };
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
  const [showTech, setShowTech] = useState(false);

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

  useDeferredEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title={data?.name ?? "מעסיק"}
      subtitle="מעסיק ומשרות"
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
          <button
            type="button"
            className="text-xs text-[var(--accent)] hover:underline"
            onClick={() => setShowTech((v) => !v)}
          >
            פרטים טכניים {showTech ? "▾" : "▸"}
          </button>
          {showTech ? (
            <p className="font-mono text-xs text-[var(--muted)]">userId: {data.userId}</p>
          ) : null}
          <section>
            <h2 className="mb-3 text-lg font-semibold">משרות</h2>
            <ul className="space-y-2">
              {data.jobs.map((j) => (
                <li key={j.jobId}>
                  <Link
                    href={`/admin/employers/${id}/jobs/${j.jobId}`}
                    className="panel block rounded-[var(--panel-radius)] p-4 transition hover:border-[var(--accent)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-lg font-semibold text-[var(--hero)]">{j.title}</span>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {j.location} · {j.statusLabel}
                          {j.createdAt ? ` · ${new Date(j.createdAt).toLocaleDateString("he-IL")}` : null}
                        </p>
                      </div>
                      <span className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                        <span>ידע {j.knowledgePercent}%</span>
                        <span>{j.userMessageCount} הודעות</span>
                        <span>גמישות {j.flexibility}/10</span>
                        <span>
                          מאצ&apos;ים {j.matchCounts.queued}/{j.matchCounts.approved}/{j.matchCounts.rejected}
                        </span>
                      </span>
                    </div>
                    {showTech ? (
                      <p className="mt-2 font-mono text-[10px] text-[var(--muted)]">jobId: {j.jobId}</p>
                    ) : null}
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
