"use client";

import { useState } from "react";
import { EmployerCandidateCard } from "@/components/EmployerCandidateCard";
import { useTranslation } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import type { CandidateCard } from "@/domain/types";

type Item = {
  matchId: string;
  score: number;
  reason: string;
  name: string;
  candidateId?: string;
  cvDocumentId?: string | null;
  card?: Partial<CandidateCard>;
};

export function CandidateQueue(props: {
  employerId: string;
  items: Item[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [questionById, setQuestionById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(matchId: string, action: "approve" | "reject" | "ask") {
    setBusyId(matchId);
    try {
      await fetch("/api/employer/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employerId: props.employerId,
          matchId,
          action,
          question: questionById[matchId],
        }),
      });
      props.onChanged();
    } finally {
      setBusyId(null);
    }
  }

  function openCv(item: Item) {
    if (!item.candidateId || !item.cvDocumentId) return;
    const qs = new URLSearchParams({
      viewerId: props.employerId,
      candidateId: item.candidateId,
      documentId: item.cvDocumentId,
    });
    window.open(`/api/cv/document?${qs.toString()}`, "_blank", "noopener,noreferrer");
  }

  if (props.items.length === 0) {
    return (
      <div className="empty-state panel-elevated border-dashed p-12 text-center text-sm text-[var(--muted)]">
        {t.candidates.empty}
      </div>
    );
  }

  return (
    <div className="tab-fade space-y-4">
      {props.items.map((item) => (
        <EmployerCandidateCard
          key={item.matchId}
          name={item.name}
          score={item.score}
          reason={item.reason}
          card={item.card}
          actions={
            <>
              {item.cvDocumentId ? (
                <Button
                  variant="secondary"
                  onClick={() => openCv(item)}
                  className="min-h-0 px-3 py-2"
                >
                  {t.candidates.viewCv}
                </Button>
              ) : null}
              <Button
                disabled={busyId === item.matchId}
                onClick={() => void act(item.matchId, "approve")}
                className="min-h-0 bg-[var(--accent)] px-3 py-2 hover:bg-[var(--accent-strong)]"
              >
                {t.candidates.fit}
              </Button>
              <Button
                variant="secondary"
                disabled={busyId === item.matchId}
                onClick={() => void act(item.matchId, "reject")}
                className="min-h-0 px-3 py-2"
              >
                {t.candidates.notFit}
              </Button>
            </>
          }
          footer={
            <div className="flex gap-2">
              <input
                value={questionById[item.matchId] ?? ""}
                onChange={(e) =>
                  setQuestionById((s) => ({ ...s, [item.matchId]: e.target.value }))
                }
                placeholder={t.candidates.askPlaceholder}
                className="min-h-11 flex-1 rounded-[var(--control-radius)] border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition duration-200 focus:border-[var(--accent)]"
              />
              <Button
                disabled={busyId === item.matchId}
                onClick={() => void act(item.matchId, "ask")}
                className="min-h-11 px-3"
              >
                {t.candidates.ask}
              </Button>
            </div>
          }
        />
      ))}
    </div>
  );
}
