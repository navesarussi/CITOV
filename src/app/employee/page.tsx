"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/components/LocaleProvider";
import { OpportunityList } from "@/components/OpportunityList";
import { ProfileAside } from "@/components/ProfileAside";

type Tab = "chat" | "jobs";

export default function EmployeePage() {
  const { t, fmt, locale } = useTranslation();
  const [tab, setTab] = useState<Tab>("chat");
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [me, setMe] = useState<{
    card: unknown;
    chat: { id: string; role: "user" | "assistant" | "system"; content: string }[];
    pendingQuestions: { id: string; question: string }[];
    error?: string;
  } | null>(null);
  const [jobs, setJobs] = useState([]);

  const refresh = useCallback(async (id: string) => {
    const [meRes, jobsRes] = await Promise.all([
      fetch(`/api/me?userId=${id}&locale=${locale}`).then((r) => r.json()),
      fetch(`/api/opportunities?userId=${id}&locale=${locale}`).then((r) => r.json()),
    ]);
    setMe(meRes);
    setJobs(jobsRes.jobs ?? []);
  }, [locale]);

  useEffect(() => {
    const raw = localStorage.getItem("shidukh_user");
    if (!raw) return;
    const user = JSON.parse(raw) as { id: string; name: string; role: string };
    if (user.role !== "employee") return;
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
          <p className="text-sm text-[var(--muted)]">{t.employee.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSwitcher />
          <div className="flex rounded-xl bg-[var(--chip)] p-1 text-sm">
            <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
              {t.employee.chatTab}
            </TabButton>
            <TabButton active={tab === "jobs"} onClick={() => setTab("jobs")}>
              {fmt(t.employee.jobsTab, { count: jobs.length })}
            </TabButton>
          </div>
        </div>
      </header>

      {tab === "chat" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <ChatPanel
            userId={userId}
            role="employee"
            locale={locale}
            initialMessages={me?.chat ?? []}
            placeholder={t.employee.chatPlaceholder}
            onDone={() => void refresh(userId)}
          />
          <ProfileAside
            kind="employee"
            card={me?.card as never}
            pendingQuestions={me?.pendingQuestions}
          />
        </div>
      ) : (
        <OpportunityList jobs={jobs} />
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
