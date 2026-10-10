"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CandidateProfileBar } from "@/components/CandidateProfileBar";
import { EmployeeChatLayout } from "@/components/EmployeeChatLayout";
import { type ChatTurnPayload } from "@/components/ChatPanel";
import { ConsentBanner } from "@/components/ConsentBanner";
import { SettingsMenu } from "@/components/SettingsMenu";
import { useTranslation } from "@/components/LocaleProvider";
import { OpportunityList } from "@/components/OpportunityList";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { WorkspaceSessionFallback } from "@/components/workspace/WorkspaceSessionFallback";
import { syncStoredUserWithGoogleSession } from "@/lib/client-session";
import { useGoogleWorkspaceSync } from "@/lib/use-google-workspace-sync";
import type { CandidateCard } from "@/domain/types";

type Tab = "chat" | "jobs";

export function EmployeeWorkspaceView(props: { layout: "page" | "embedded" }) {
  const { t, fmt, locale } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("chat");
  const { user: sessionUser, ready: sessionReady, syncError, retrySync } =
    useGoogleWorkspaceSync("employee");
  const [userId, setUserId] = useState<string | null>(null);
  const name = sessionUser?.name ?? "";
  const [me, setMe] = useState<{
    card: unknown;
    chat: { id: string; role: "user" | "assistant" | "system"; content: string }[];
    pendingQuestions: { id: string; question: string }[];
    hasCv?: boolean;
    cvFileName?: string | null;
    cvExtractionStatus?: "pending" | "ok" | "partial" | "failed" | null;
    candidateProfiles?: { id: string; label: string; kind: "self" | "other" }[];
    activeProfileId?: string;
    error?: string;
  } | null>(null);
  const [jobs, setJobs] = useState([]);
  const [profileBusy, setProfileBusy] = useState(false);

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
      const meFetch = await fetch(`/api/me?userId=${id}&locale=${locale}`);
      if (meFetch.status === 409) {
        const synced = await syncStoredUserWithGoogleSession("employee");
        if (synced?.id && synced.id !== id) {
          setUserId(synced.id);
          return;
        }
      }
      const [meRes] = await Promise.all([meFetch.json(), refreshLists(id)]);
      setMe(meRes);
    },
    [locale, refreshLists],
  );

  useEffect(() => {
    setUserId(sessionUser?.id ?? null);
  }, [sessionUser?.id]);

  useEffect(() => {
    if (!userId) return;
    void refresh(userId);
  }, [refresh, userId]);

  useEffect(() => {
    if (props.layout !== "page") return;
    if (sessionReady && !userId) {
      router.replace("/");
    }
  }, [props.layout, sessionReady, userId, router]);

  async function selectProfile(profileId: string) {
    if (!userId || profileBusy || profileId === me?.activeProfileId) return;
    setProfileBusy(true);
    const previous = me;
    try {
      const res = await fetch("/api/employee/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "select", profileId }),
      });
      const data = (await res.json()) as {
        error?: string;
        card?: unknown;
        chat?: NonNullable<typeof me>["chat"];
        profiles?: NonNullable<typeof me>["candidateProfiles"];
        activeProfileId?: string;
      };
      if (data.error || !data.card) {
        setMe(previous);
        return;
      }
      setMe((prev) =>
        prev
          ? {
              ...prev,
              card: data.card,
              chat: data.chat ?? [],
              candidateProfiles: data.profiles ?? prev.candidateProfiles,
              activeProfileId: data.activeProfileId ?? profileId,
            }
          : prev,
      );
    } finally {
      setProfileBusy(false);
    }
  }

  function onTurn(payload: ChatTurnPayload) {
    setMe((prev) =>
      prev
        ? {
            ...prev,
            card: payload.card ?? prev.card,
            chat: (payload.chat as typeof prev.chat) ?? prev.chat,
            pendingQuestions: payload.pendingQuestions ?? prev.pendingQuestions,
            hasCv: payload.hasCv ?? prev.hasCv,
            cvFileName: payload.hasCv === false ? null : prev.cvFileName,
            cvExtractionStatus: payload.hasCv === false ? null : prev.cvExtractionStatus,
          }
        : {
            card: payload.card,
            chat: (payload.chat as never) ?? [],
            pendingQuestions: payload.pendingQuestions ?? [],
            hasCv: payload.hasCv,
          },
    );
    if (userId) void refresh(userId);
  }

  if (!sessionReady || !userId) {
    if (props.layout === "embedded") {
      return (
        <WorkspaceSessionFallback
          loading={!sessionReady}
          syncError={sessionReady && !userId ? syncError : null}
          onRetry={retrySync}
          embedded
        />
      );
    }
    return (
      <main className="workspace-loading atmosphere">
        <p>{t.session.loading}</p>
      </main>
    );
  }

  const hasCv = Boolean(me?.hasCv);

  const tabs = (
    <SegmentedTabs
      value={tab}
      onChange={(id) => setTab(id as Tab)}
      fullWidth={props.layout === "page"}
      variant={props.layout === "page" ? "workspace" : "default"}
      tabs={[
        { id: "chat", label: t.employee.chatTab },
        { id: "jobs", label: fmt(t.employee.jobsTab, { count: jobs.length }) },
      ]}
    />
  );

  const body = (
    <>
      {syncError || me?.error ? (
        <p className="mb-4 rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">
          {syncError ?? me?.error}
        </p>
      ) : null}

      {tab === "chat" ? (
        <>
          <CandidateProfileBar
            label={t.candidateProfiles.label}
            profiles={me?.candidateProfiles ?? []}
            activeProfileId={me?.activeProfileId ?? null}
            busy={profileBusy}
            onSelect={(id) => void selectProfile(id)}
          />
          <EmployeeChatLayout
            key={`${userId}-${me?.activeProfileId ?? "self"}`}
            userId={userId}
            locale={locale}
            chat={me?.chat ?? []}
            card={(me?.card as CandidateCard | null) ?? null}
            hasCv={hasCv}
            cvPending={me?.cvExtractionStatus === "pending"}
            placeholder={t.employee.chatPlaceholder}
            onTurn={onTurn}
            onCvDone={() => void refresh(userId)}
            onFlexibilityChange={(value) => {
              setMe((prev) =>
                prev
                  ? { ...prev, card: { ...(prev.card as object), flexibility: value } }
                  : prev,
              );
            }}
          />
        </>
      ) : (
        <div className="workspace-stack enter-delay tab-fade">
          <OpportunityList jobs={jobs} />
        </div>
      )}
    </>
  );

  if (props.layout === "embedded") {
    return (
      <div className="workspace-embedded-employee flex min-h-0 flex-1 flex-col gap-4">
        {tabs}
        <div
          className={
            tab === "chat"
              ? "workspace-main--fit flex min-h-0 flex-1 flex-col"
              : "min-h-0 flex-1"
          }
        >
          {body}
        </div>
        <ConsentBanner />
      </div>
    );
  }

  return (
    <div className="workspace-shell workspace-shell--employee atmosphere">
      <WorkspaceHeader
        name={name}
        settings={<SettingsMenu variant="header" />}
        tabs={tabs}
      />
      <main className={`workspace-main ${tab === "chat" ? "workspace-main--fit" : ""}`}>{body}</main>
      <ConsentBanner />
    </div>
  );
}
