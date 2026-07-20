"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChatPanel, type ChatTurnPayload } from "@/components/ChatPanel";
import { SettingsMenu } from "@/components/SettingsMenu";
import { useTranslation } from "@/components/LocaleProvider";
import { OpportunityList } from "@/components/OpportunityList";
import { ProfileAside } from "@/components/ProfileAside";

type Tab = "chat" | "jobs";

function readEmployeeSession(): { id: string; name: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("shidukh_user");
    if (!raw) return null;
    const user = JSON.parse(raw) as { id: string; name: string; role: string };
    return user.role === "employee" ? { id: user.id, name: user.name } : null;
  } catch {
    return null;
  }
}

export default function EmployeePage() {
  const { t, fmt, locale } = useTranslation();
  const [tab, setTab] = useState<Tab>("chat");
  const [sessionUser] = useState(readEmployeeSession);
  const [bootstrapping, setBootstrapping] = useState(() => Boolean(sessionUser));
  const userId = sessionUser?.id ?? null;
  const name = sessionUser?.name ?? "";
  const [me, setMe] = useState<{
    card: unknown;
    chat: { id: string; role: "user" | "assistant" | "system"; content: string }[];
    pendingQuestions: { id: string; question: string }[];
    error?: string;
  } | null>(null);
  const [jobs, setJobs] = useState([]);

  const refreshLists = useCallback(
    async (id: string) => {
      const jobsRes = await fetch(`/api/opportunities?userId=${id}&locale=${locale}`).then((r) =>
        r.json(),
      );
      setJobs(jobsRes.jobs ?? []);
    },
    [locale],
  );

  const refresh = useCallback(
    async (id: string) => {
      const [meRes] = await Promise.all([
        fetch(`/api/me?userId=${id}&locale=${locale}`).then((r) => r.json()),
        refreshLists(id),
      ]);
      setMe(meRes);
    },
    [locale, refreshLists],
  );

  useEffect(() => {
    if (!userId) return;
    // Initial session hydrate from API (async setState is intentional).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    void refresh(userId).finally(() => setBootstrapping(false));
  }, [refresh, userId]);

  function onTurn(payload: ChatTurnPayload) {
    setMe((prev) =>
      prev
        ? {
            ...prev,
            card: payload.card ?? prev.card,
            chat: (payload.chat as typeof prev.chat) ?? prev.chat,
            pendingQuestions: payload.pendingQuestions ?? prev.pendingQuestions,
          }
        : prev,
    );
    if (userId) void refreshLists(userId);
  }

  if (bootstrapping) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-center text-[var(--muted)]">
        {t.session.loading}
      </main>
    );
  }

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
          <Link href="/" className="text-sm font-medium tracking-wide text-[var(--accent)]">
            {t.app.name}
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--hero)]">
            {name}
          </h1>
          <p className="text-sm text-[var(--muted)]">{t.employee.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SettingsMenu />
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
        me ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <ChatPanel
              key={`${userId}-employee`}
              userId={userId}
              role="employee"
              locale={locale}
              initialMessages={me.chat}
              placeholder={t.employee.chatPlaceholder}
              onTurn={onTurn}
            />
            <ProfileAside
              kind="employee"
              card={me.card as never}
              pendingQuestions={me.pendingQuestions}
            />
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t.session.loading}</p>
        )
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
          ? "rounded-lg bg-white px-3 py-1.5 font-medium shadow-sm"
          : "rounded-lg px-3 py-1.5 text-[var(--muted)]"
      }
    >
      {props.children}
    </button>
  );
}
