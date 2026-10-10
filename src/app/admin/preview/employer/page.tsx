"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { EmployerChatLayout } from "@/components/EmployerChatLayout";
import type { JobCard } from "@/domain/types";

export default function AdminPreviewEmployerPage() {
  const [data, setData] = useState<{
    userId: string;
    name: string;
    card: JobCard;
    chat: { id: string; role: "user" | "assistant" | "system"; content: string }[];
    activeJobId: string;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/preview?role=employer")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("טעינה נכשלה"));
  }, []);

  return (
    <AdminShell title="תצוגת מעסיק (מנהל)" subtitle="קריאה בלבד — לא מחליפה התחברות מעסיק">
      <p className="mb-4 text-sm text-[var(--muted)]">
        <Link href="/admin" className="text-[var(--accent)] hover:underline">
          ← חזרה לפורטל
        </Link>
        {data ? ` · ${data.name}` : null}
      </p>
      {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
      {data ? (
        <EmployerChatLayout
          userId={data.userId}
          locale="he"
          chat={data.chat}
          card={data.card}
          activeJobId={data.activeJobId}
          placeholder="תצוגת מנהל — השיחה חסומה"
          hydrating={false}
          importTitle=""
          importHint=""
          onTurn={() => undefined}
          onFlexibilityChange={() => undefined}
          onImportDone={() => undefined}
        />
      ) : null}
    </AdminShell>
  );
}
