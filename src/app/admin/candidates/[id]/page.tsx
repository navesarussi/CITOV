"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import { AdminChatLog } from "@/components/admin/AdminChatLog";
import { AdminMatchList } from "@/components/admin/AdminMatchList";
import { AdminFieldGrid } from "@/components/admin/AdminFieldGrid";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/Button";
import type { CandidateCard, ChatMessage } from "@/domain/types";

type Detail = {
  userId: string;
  name: string;
  email: string | null;
  knowledgePercent: number;
  userMessageCount: number;
  flexibility: number;
  card: CandidateCard;
  chat: ChatMessage[];
  matches: {
    id: string;
    jobOwnerId: string;
    jobId: string;
    scorePercent: number;
    reason: string;
    status: string;
  }[];
  cvDocuments: { id: string; fileName: string; uploadedAt: string; byteSize: number }[];
};

export default function AdminCandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/admin/candidates/${id}`, { signal: controller.signal });
      clearTimeout(timer);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "שגיאה בטעינה");
        return;
      }
      setData(json.candidate);
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
      title={data?.name ?? "מועמד"}
      subtitle="כרטיס מלא — קריאה בלבד"
      actions={
        <Button variant="secondary" onClick={() => void load()} className="min-h-9 px-3 py-1.5 text-sm">
          רענון
        </Button>
      }
    >
      <p className="mb-4 text-sm">
        <Link href="/admin/candidates" className="text-[var(--accent)] hover:underline">
          ← חזרה לרשימה
        </Link>
      </p>
      {error ? (
        <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
      ) : null}
      {!data && !error ? <p className="text-sm text-[var(--muted)]">טוען…</p> : null}
      {data ? (
        <div className="space-y-8">
          <section className="flex flex-wrap gap-3 text-sm">
            {data.email ? <span className="text-[var(--muted)]">{data.email}</span> : null}
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
                meta: `job ${m.jobId} · owner ${m.jobOwnerId}`,
              }))}
            />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">CV</h2>
            {data.cvDocuments.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">אין קובץ CV.</p>
            ) : (
              <ul className="space-y-2">
                {data.cvDocuments.map((d) => (
                  <li key={d.id}>
                    <a
                      href={`/api/admin/candidates/${id}/cv/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--accent)] hover:underline"
                    >
                      {d.fileName}
                    </a>
                    <span className="ms-2 text-xs text-[var(--muted)]">
                      {new Date(d.uploadedAt).toLocaleString("he-IL")} · {d.byteSize} B
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
