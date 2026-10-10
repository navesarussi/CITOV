"use client";

import { useCallback, useEffect, useState } from "react";
import { type ChatTurnPayload } from "@/components/ChatPanel";
import { EmployeeChatLayout } from "@/components/EmployeeChatLayout";
import { useTranslation } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import type { CandidateCard } from "@/domain/types";

export function AdminSandboxEmployee(props: { locale?: "he" | "en" }) {
  const { t, locale } = useTranslation();
  const loc = props.locale ?? locale;
  const [userId, setUserId] = useState<string | null>(null);
  const [card, setCard] = useState<CandidateCard | null>(null);
  const [chat, setChat] = useState<
    { id: string; role: "user" | "assistant" | "system"; content: string }[]
  >([]);
  const [hasCv, setHasCv] = useState(false);
  const [cvPending, setCvPending] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sandbox?role=employee");
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setUserId(data.userId);
    setCard(data.card);
    setChat(data.chat ?? []);
    setHasCv(Boolean(data.hasCv));
  }, []);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  async function resetSandbox() {
    if (!confirm("לאפס את מועד הבדיקה? (צ'אט, כרטיס וקו״ח)")) return;
    setBusy(true);
    try {
      await fetch("/api/admin/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", role: "employee" }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  function onTurn(payload: ChatTurnPayload) {
    if (payload.chat) setChat(payload.chat);
    if (payload.card) setCard(payload.card as CandidateCard);
    if (payload.hasCv != null) setHasCv(payload.hasCv);
  }

  async function onCvDone() {
    if (!userId) return;
    setCvPending(true);
    try {
      const me = await fetch(`/api/me?userId=${userId}&locale=${loc}`).then((r) => r.json());
      setHasCv(Boolean(me.hasCv));
      setCard(me.card);
      setChat(me.chat ?? []);
    } finally {
      setCvPending(false);
    }
  }

  if (!userId || !card) {
    return <p className="text-sm text-[var(--muted)]">טוען ארגז חול…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        <span className="font-semibold">ארגז חול מנהל</span>
        <span className="text-amber-900/80">— לא נספר במטריקות חיות · לא משפיע על משתמשים אמיתיים</span>
        <Button variant="secondary" className="ms-auto min-h-9" disabled={busy} onClick={() => void resetSandbox()}>
          איפוס בדיקה
        </Button>
      </div>
      <EmployeeChatLayout
        userId={userId}
        locale={loc}
        chat={chat}
        card={card}
        hasCv={hasCv}
        cvPending={cvPending}
        placeholder={t.chat.employeeEmptyHint}
        onTurn={onTurn}
        onCvDone={() => void onCvDone()}
      />
    </div>
  );
}
