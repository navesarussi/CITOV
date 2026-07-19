"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CandidateQueue } from "@/components/CandidateQueue";
import { ChatPanel } from "@/components/ChatPanel";
import { ProfileAside } from "@/components/ProfileAside";

type Tab = "chat" | "candidates";

export default function EmployerPage() {
  const [tab, setTab] = useState<Tab>("chat");
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [me, setMe] = useState<{
    card: unknown;
    chat: { id: string; role: "user" | "assistant" | "system"; content: string }[];
    aiMode?: string;
  } | null>(null);
  const [candidates, setCandidates] = useState([]);

  const refresh = useCallback(async (id: string) => {
    const [meRes, candRes] = await Promise.all([
      fetch(`/api/me?userId=${id}`).then((r) => r.json()),
      fetch(`/api/candidates?userId=${id}`).then((r) => r.json()),
    ]);
    setMe(meRes);
    setCandidates(candRes.candidates ?? []);
  }, []);

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
        <p className="text-[var(--muted)]">אין סשן פעיל.</p>
        <Link href="/" className="mt-4 inline-block text-[var(--accent)]">
          חזרה להתחלה
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-full w-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-[var(--accent)]">
            שידוך
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--hero)]">{name}</h1>
          <p className="text-sm text-[var(--muted)]">
            צ׳אט עם הסוכן · מועמדים מדורגים
            {me?.aiMode === "heuristic" ? " · מצב מקומי (בלי מפתח Gemini)" : ""}
          </p>
        </div>
        <div className="flex rounded-xl bg-[var(--chip)] p-1 text-sm">
          <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
            שיחה
          </TabButton>
          <TabButton
            active={tab === "candidates"}
            onClick={() => setTab("candidates")}
          >
            מועמדים ({candidates.length})
          </TabButton>
        </div>
      </header>

      {tab === "chat" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <ChatPanel
            userId={userId}
            role="employer"
            initialMessages={me?.chat ?? []}
            placeholder="למשל: מחפש מלצר/ית למסעדה בתל אביב…"
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
