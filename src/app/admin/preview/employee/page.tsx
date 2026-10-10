"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { EmployeeChatLayout } from "@/components/EmployeeChatLayout";
import type { CandidateCard } from "@/domain/types";

export default function AdminPreviewEmployeePage() {
  const [data, setData] = useState<{
    userId: string;
    name: string;
    card: CandidateCard;
    chat: { id: string; role: "user" | "assistant" | "system"; content: string }[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/preview?role=employee")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("טעינה נכשלה"));
  }, []);

  return (
    <AdminShell title="תצוגת מועמד (מנהל)" subtitle="קריאה בלבד — לא מחליפה התחברות מועמד">
      <p className="mb-4 text-sm text-[var(--muted)]">
        <Link href="/admin" className="text-[var(--accent)] hover:underline">
          ← חזרה לפורטל
        </Link>
        {data ? ` · ${data.name} (${data.userId})` : null}
      </p>
      {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
      {data ? (
        <EmployeeChatLayout
          userId={data.userId}
          locale="he"
          chat={data.chat}
          card={data.card}
          hasCv
          cvPending={false}
          placeholder="תצוגת מנהל — השיחה חסומה"
          onTurn={() => undefined}
          onCvDone={() => undefined}
          readOnly
        />
      ) : null}
    </AdminShell>
  );
}
