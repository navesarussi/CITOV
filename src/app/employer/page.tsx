"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CandidateQueue } from "@/components/CandidateQueue";
import { ChatPanel } from "@/components/ChatPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/components/LocaleProvider";
import { ProfileAside } from "@/components/ProfileAside";

type Tab = "chat" | "candidates";

export default function EmployerPage() {
  const { t, fmt, locale } = useTranslation();
  const [tab, setTab] = useState<Tab>("chat");
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [me, setMe] = useState<{
    card: unknown;
    chat: { id: string; role: "user" | "assistant" | "system"; content: string }[];
    error?: string;
  } | null>(null);
  const [candidates, setCandidates] = useState([]);

  const refresh = useCallback(async (id: string) => {
    const [meRes, candRes] = await Promise.all([
      fetch(`/api/me?userId=${id}&locale=${locale}`).then((r) => r.json()),
      fetch(`/api/candidates?userId=${id}&locale=${locale}`).then((r) => r.json()),
    ]);
    setMe(meRes);
    setCandidates(candRes.candidates ?? []);
  }, [locale]);

  useEffect(() => {
    const raw = localStorage.getItem("shidukh_user");
    if (!raw) return;
    const user = JSON.parse(raw) as { id: string; name: string; role: string };
    if (user.role !== "employer") return;
    setUserId(user.id);
    setName(user.name);
    void refresh(user.id);
  }, [refresh]);

  if (!userId) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-[var(--muted)]">{t.session.noActiveSession}</p>
        <Link href="/" className="mt-4 inline-block text-[var(--accent)]">
          {t.session.backToStart}
        </Link>
      </main>
    );
  }

  if (me?.error) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-[var(--muted)]">{me.error}</p>
        <Link href="/" className="mt-4 inline-block text-[var(--accent)]">
          {t.session.reconnect}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-full w-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-[var(--accent)]">
            {t.app.name}
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--hero)]">{name}</h1>
          <p className="text-sm text-[var(--muted)]">{t.employer.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSwitcher />
          <div className="flex rounded-xl bg-[var(--chip)] p-1 text-sm">
            <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
              {t.employer.chatTab}
            </TabButton>
            <TabButton active={tab === "candidates"} onClick={() => setTab("candidates")}>
              {fmt(t.employer.candidatesTab, { count: candidates.length })}
            </TabButton>
          </div>
        </div>
      </header>

      {tab === "chat" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <ChatPanel
            key={`${userId}-employer`}
            userId={userId}
            role="employer"
            locale={locale}
            initialMessages={me?.chat ?? []}
            placeholder={t.employer.chatPlaceholder}
            onDone={() => void refresh(userId)}
          />
          <ProfileAside kind="employer" card={me?.card as never} />
        </div>
      ) : (
        <CandidateQueue
          employerId={userId}
          items={candidates}
          onChanged={() => void refresh(userId)}
        />
      )}
    </main>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        props.active
          ? "rounded-lg bg-white px-3 py-1.5 font-medium"
          : "rounded-lg px-3 py-1.5 text-[var(--muted)]"
      }
    >
      {props.children}
    </button>
  );
}
