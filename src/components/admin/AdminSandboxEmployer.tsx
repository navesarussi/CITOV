"use client";

import { useCallback, useEffect, useState } from "react";
import { type ChatTurnPayload } from "@/components/ChatPanel";
import { EmployerChatLayout } from "@/components/EmployerChatLayout";
import { useTranslation } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import type { JobCard } from "@/domain/types";

export function AdminSandboxEmployer() {
  const { t, locale } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<JobCard | null>(null);
  const [chat, setChat] = useState<
    { id: string; role: "user" | "assistant" | "system"; content: string }[]
  >([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sandbox?role=employer");
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setUserId(data.userId);
    setCard(data.card);
    setChat(data.chat ?? []);
    setActiveJobId(data.activeJobId ?? null);
  }, []);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  async function resetSandbox() {
    if (!confirm("לאפס את מעסיק הבדיקה? (חברה, משרות וצ'אט)")) return;
    setBusy(true);
    try {
      await fetch("/api/admin/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", role: "employer" }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createJob() {
    if (!userId) return;
    const name = prompt("שם משרה חדשה (אופציונלי):") ?? "";
    setBusy(true);
    try {
      const res = await fetch("/api/employer/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "create", name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setActiveJobId(data.activeJobId);
      setCard(data.card);
      setChat(data.chat ?? []);
    } finally {
      setBusy(false);
    }
  }

  function onTurn(payload: ChatTurnPayload) {
    if (payload.chat) setChat(payload.chat);
    if (payload.card) setCard(payload.card as JobCard);
    if (payload.jobId) setActiveJobId(payload.jobId);
  }

  async function onFlexibilityChange(value: number) {
    if (!userId || !activeJobId) return;
    await fetch("/api/flexibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, jobId: activeJobId, value, role: "employer" }),
    });
  }

  if (!userId || !card) {
    return <p className="text-sm text-[var(--muted)]">טוען ארגז חול…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        <span className="font-semibold">ארגז חול מנהל</span>
        <span className="text-amber-900/80">— לא נספר במטריקות · לא משפיע על משתמשים אמיתיים</span>
        <Button variant="secondary" className="min-h-9" disabled={busy} onClick={() => void createJob()}>
          משרה חדשה
        </Button>
        <Button variant="secondary" className="min-h-9" disabled={busy} onClick={() => void resetSandbox()}>
          איפוס בדיקה
        </Button>
      </div>
      <EmployerChatLayout
        userId={userId}
        locale={locale}
        activeJobId={activeJobId}
        chat={chat}
        card={card}
        placeholder={t.chat.employerEmptyHint}
        hydrating={false}
        importTitle={t.fileImport.jobTitle}
        importHint={t.fileImport.jobHint}
        onTurn={onTurn}
        onFlexibilityChange={(v) => void onFlexibilityChange(v)}
        onImportDone={() => void load()}
      />
    </div>
  );
}
