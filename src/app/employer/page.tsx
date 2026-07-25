"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CandidateQueue } from "@/components/CandidateQueue";
import { type ChatTurnPayload } from "@/components/ChatPanel";
import { EmployerChatLayout } from "@/components/EmployerChatLayout";
import { JobFilterBar } from "@/components/JobFilterBar";
import { SettingsMenu } from "@/components/SettingsMenu";
import { useTranslation } from "@/components/LocaleProvider";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  type EmployerJobWorkspace,
  parseJobWorkspaces,
  pickJobWorkspace,
  upsertJobWorkspace,
  workspaceSummaries,
} from "@/domain/employer-job-workspace";
import type { ChatMessage, JobCard } from "@/domain/types";
import { useStoredUser } from "@/lib/use-stored-user";

type Tab = "chat" | "candidates";

export default function EmployerPage() {
  const { t, fmt, locale } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("chat");
  const { user: sessionUser, ready: sessionReady } = useStoredUser("employer");
  const userId = sessionUser?.id ?? null;
  const name = sessionUser?.name ?? "";
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<EmployerJobWorkspace[]>([]);
  const [me, setMe] = useState<{
    card: unknown;
    chat: { id: string; role: "user" | "assistant" | "system"; content: string }[];
    error?: string;
  } | null>(null);
  const [candidates, setCandidates] = useState([]);
  const [hydrating, setHydrating] = useState(false);
  const [jobBusy, setJobBusy] = useState(false);

  const jobs = workspaceSummaries(workspaces);

  const refreshLists = useCallback(
    async (id: string, jobId?: string | null) => {
      const q = jobId ? `&jobId=${encodeURIComponent(jobId)}` : "";
      const candRes = await fetch(`/api/candidates?userId=${id}${q}&locale=${locale}`).then((r) =>
        r.json(),
      );
      setCandidates(candRes.candidates ?? []);
    },
    [locale],
  );

  const refresh = useCallback(
    async (id: string, jobId?: string | null) => {
      const q = jobId ? `&jobId=${encodeURIComponent(jobId)}` : "";
      const meRes = await fetch(`/api/me?userId=${id}${q}&locale=${locale}`).then((r) =>
        r.json(),
      );
      const nextWorkspaces = parseJobWorkspaces(meRes.jobs);
      setWorkspaces(nextWorkspaces);
      setMe(meRes);
      const nextJobId = meRes.activeJobId ?? jobId ?? null;
      setActiveJobId(nextJobId);
      void refreshLists(id, nextJobId);
    },
    [locale, refreshLists],
  );

  useEffect(() => {
    if (!userId) return;
    setHydrating(true);
    void refresh(userId).finally(() => setHydrating(false));
  }, [refresh, userId]);

  useEffect(() => {
    if (sessionReady && !userId) {
      router.replace("/for-employers");
    }
  }, [sessionReady, userId, router]);

  function onTurn(payload: ChatTurnPayload) {
    const jobId = payload.jobId ?? activeJobId;
    setMe((prev) =>
      prev
        ? {
            ...prev,
            card: payload.card ?? prev.card,
            chat: (payload.chat as typeof prev.chat) ?? prev.chat,
          }
        : { card: payload.card, chat: (payload.chat as never) ?? [] },
    );
    if (jobId) {
      setWorkspaces((prev) =>
        upsertJobWorkspace(prev, jobId, {
          card: (payload.card as JobCard) ?? undefined,
          chat: (payload.chat as ChatMessage[]) ?? undefined,
        }),
      );
    }
    if (userId) void refreshLists(userId, jobId);
  }

  async function persistJobAction(
    action: "select" | "create" | "rename",
    jobId?: string,
    jobName?: string,
  ) {
    if (!userId) return null;
    const res = await fetch("/api/employer/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, jobId, name: jobName }),
    });
    return (await res.json()) as {
      error?: string;
      jobs?: unknown;
      activeJobId?: string;
      card?: unknown;
      chat?: ChatMessage[];
    };
  }

  async function selectJob(jobId: string) {
    if (!userId || jobId === activeJobId) return;
    const previousId = activeJobId;
    const previousMe = me;

    const snapped =
      previousId && me
        ? upsertJobWorkspace(workspaces, previousId, {
            card: me.card as JobCard,
            chat: me.chat as ChatMessage[],
          })
        : workspaces;
    if (snapped !== workspaces) setWorkspaces(snapped);

    const local = pickJobWorkspace(snapped, jobId);
    setActiveJobId(jobId);
    if (local) setMe({ card: local.card, chat: local.chat });
    setCandidates([]);
    void refreshLists(userId, jobId);

    const data = await persistJobAction("select", jobId);
    if (!data || data.error) {
      setActiveJobId(previousId);
      setMe(previousMe);
      if (previousId) void refreshLists(userId, previousId);
      return;
    }

    const next = parseJobWorkspaces(data.jobs);
    if (next.length) setWorkspaces(next);
    setActiveJobId(data.activeJobId ?? jobId);
    setMe({ card: data.card, chat: data.chat ?? [] });
  }

  async function renameJob(jobId: string, jobName: string) {
    if (!userId) return;
    const previous = workspaces;
    setWorkspaces((prev) => upsertJobWorkspace(prev, jobId, { name: jobName }));

    const data = await persistJobAction("rename", jobId, jobName);
    if (!data || data.error) {
      setWorkspaces(previous);
      return;
    }
    const next = parseJobWorkspaces(data.jobs);
    if (next.length) setWorkspaces(next);
  }

  async function createJob(jobName?: string) {
    if (!userId || jobBusy) return;
    setJobBusy(true);
    try {
      const data = await persistJobAction("create", undefined, jobName);
      if (!data || data.error) return;
      const next = parseJobWorkspaces(data.jobs);
      if (next.length) setWorkspaces(next);
      setActiveJobId(data.activeJobId ?? null);
      setMe({ card: data.card, chat: data.chat ?? [] });
      setCandidates([]);
      setTab("chat");
    } finally {
      setJobBusy(false);
    }
  }

  function jobLabel(job: { id: string; name?: string; title?: string; field?: string }, index: number) {
    return (
      job.name?.trim() ||
      job.title?.trim() ||
      job.field?.trim() ||
      fmt(t.employer.jobFallback, { n: String(index + 1) })
    );
  }

  function askJobName(current?: string): string | null {
    const raw = window.prompt(t.employer.jobNamePrompt, current?.trim() || "");
    if (raw == null) return null;
    return raw.trim();
  }

  if (!sessionReady || !userId) {
    return (
      <main className="workspace-loading atmosphere">
        <p>{t.session.loading}</p>
      </main>
    );
  }

  return (
    <div className="workspace-shell atmosphere">
      <WorkspaceHeader
        name={name}
        subtitle={t.employer.subtitle}
        homeHref="/for-employers"
        settings={<SettingsMenu variant="header" />}
        tabs={
          <SegmentedTabs
            value={tab}
            onChange={(id) => setTab(id as Tab)}
            tabs={[
              { id: "chat", label: t.employer.chatTab },
              {
                id: "candidates",
                label: fmt(t.employer.candidatesTab, { count: candidates.length }),
              },
            ]}
          />
        }
      />
      <main className="workspace-main">
        <JobFilterBar
          label={t.employer.jobsFilter}
          jobs={jobs}
          activeJobId={activeJobId}
          busy={jobBusy}
          newJobLabel={t.employer.newJob}
          renameLabel={t.employer.renameJob}
          jobLabel={jobLabel}
          onSelect={(id) => void selectJob(id)}
          onCreate={() => {
            const name = askJobName();
            if (name === null) return;
            void createJob(name || undefined);
          }}
          onRename={(id) => {
            const current = jobs.find((j) => j.id === id);
            const name = askJobName(
              jobLabel(current ?? { id }, jobs.findIndex((j) => j.id === id)),
            );
            if (name === null || !name) return;
            void renameJob(id, name);
          }}
        />
        {me?.error ? (
          <p className="mb-4 rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">
            {me.error}
          </p>
        ) : null}
        {tab === "chat" ? (
          <EmployerChatLayout
            userId={userId}
            locale={locale}
            activeJobId={activeJobId}
            chat={me?.chat ?? []}
            card={me?.card}
            placeholder={t.employer.chatPlaceholder}
            hydrating={hydrating && !me}
            importTitle={t.fileImport.jobTitle}
            importHint={t.fileImport.jobHint}
            onTurn={onTurn}
            onFlexibilityChange={(value) => {
              setMe((prev) =>
                prev
                  ? { ...prev, card: { ...(prev.card as object), flexibility: value } }
                  : prev,
              );
              if (activeJobId) {
                setWorkspaces((prev) => {
                  const hit = pickJobWorkspace(prev, activeJobId);
                  if (!hit) return prev;
                  return upsertJobWorkspace(prev, activeJobId, {
                    card: { ...hit.card, flexibility: value },
                  });
                });
              }
            }}
            onImportDone={() => void refresh(userId, activeJobId)}
          />
        ) : (
          <CandidateQueue
            employerId={userId}
            items={candidates}
            onChanged={() => void refresh(userId, activeJobId)}
          />
        )}
      </main>
    </div>
  );
}
