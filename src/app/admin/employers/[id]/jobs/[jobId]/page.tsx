"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminChatLog } from "@/components/admin/AdminChatLog";
import { AdminMatchList } from "@/components/admin/AdminMatchList";
import { AdminFieldGrid } from "@/components/admin/AdminFieldGrid";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/Button";
import type { ChatMessage, JobCard } from "@/domain/types";

type Detail = {
  jobId: string;
  title: string;
  employerId: string;
  employerName: string;
  knowledgePercent: number;
  userMessageCount: number;
  flexibility: number;
  card: JobCard;
  chat: ChatMessage[];
  matches: {
    id: string;
    candidateId: string;
    scorePercent: number;
    reason: string;
    status: string;
  }[];
};

export default function AdminJobDetailPage() {
  const params = useParams<{ id: string; jobId: string }>();
  const { id, jobId } = params;
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/admin/employers/${id}/jobs/${jobId}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "שגיאה בטעינה");
        return;
      }
      setData(json.job);
      setError(null);
    } catch {
      setError("הטעינה ארכה מדי או נכשלה.");
    }
  }, [id, jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title={data?.title ?? "משרה"}
      subtitle={data ? `מעסיק: ${data.employerName}` : "כרטיס משרה — קריאה בלבד"}
      actions={
        <Button variant="secondary" onClick={() => void load()} className="min-h-9 px-3 py-1.5 text-sm">
          רענון
        </Button>
      }
    >
      <p className="mb-4 text-sm">
        <Link href={`/admin/employers/${id}`} className="text-[var(--accent)] hover:underline">
          ← חזרה למעסיק
        </Link>
      </p>
      {error ? (
        <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
      ) : null}
      {!data && !error ? <p className="text-sm text-[var(--muted)]">טוען…</p> : null}
      {data ? (
        <div className="space-y-8">
          <section className="flex flex-wrap gap-3 text-sm">
            <span>ידע {data.knowledgePercent}%</span>
            <span>גמישות {data.flexibility}/10</span>
            <span>{data.userMessageCount} הודעות משתמש</span>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">כרטיס</h2>
            <AdminFieldGrid card={data.card as unknown as Record<string, unknown>} />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">מאצ׳ים</h2>
            <AdminMatchList
              items={data.matches.map((m) => ({
                id: m.id,
                scorePercent: m.scorePercent,
                reason: m.reason,
                status: m.status,
                meta: `מועמד ${m.candidateId}`,
              }))}
            />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">צ׳אט</h2>
            <AdminChatLog chat={data.chat} />
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
