"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SettingsMenu } from "@/components/SettingsMenu";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/components/LocaleProvider";
import { syncStoredUserWithGoogleSession } from "@/lib/client-session";
import type { RelevanceLabel } from "@/domain/matching-eval/types";
import type { CrowdPair } from "@/application/crowd-labeling";

export default function HelpMatchPage() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [pair, setPair] = useState<CrowdPair | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    const res = await fetch(`/api/crowd-labeling?userId=${encodeURIComponent(id)}`);
    const data = await res.json();
    setPair(data.pair ?? null);
  }, []);

  useEffect(() => {
    void syncStoredUserWithGoogleSession("employee").then((u) => {
      if (u?.id) {
        setUserId(u.id);
        void load(u.id);
      }
    });
  }, [load]);

  async function submit(label: RelevanceLabel) {
    if (!userId || !pair || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/crowd-labeling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          jobId: pair.jobId,
          candidateId: pair.candidateId,
          label,
        }),
      });
      const data = await res.json();
      setPair(data.pair ?? null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="atmosphere min-h-dvh px-4 py-8">
      <SettingsMenu />
      <main className="mx-auto max-w-lg space-y-4">
        <h1 className="text-xl font-bold text-[var(--hero)]">עזרו לנו לדייק</h1>
        <p className="text-sm text-[var(--muted)]">
          תיוג אופציונלי — ללא שמות או פרטי קשר. אפשר לדלג בכל רגע.
        </p>
        {!userId ? (
          <p className="text-sm">
            <Link href="/" className="text-[var(--accent)] hover:underline">
              התחברו
            </Link>{" "}
            כדי לתרום תיוג.
          </p>
        ) : !pair ? (
          <p className="text-sm text-[var(--muted)]">אין זוגות כרגע — תודה!</p>
        ) : (
          <section className="panel space-y-3 rounded-[var(--panel-radius)] p-5">
            <p className="text-sm font-semibold">{pair.jobTitle}</p>
            <p className="text-xs text-[var(--muted)]">
              {pair.jobField} · {pair.jobLocation}
            </p>
            <p className="text-sm">↔ {pair.candidateRole}</p>
            <p className="text-xs text-[var(--muted)]">
              {pair.candidateField} · {pair.candidateLocation}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button disabled={busy} onClick={() => void submit("good")}>
                מתאים
              </Button>
              <Button disabled={busy} variant="secondary" onClick={() => void submit("acceptable")}>
                סביר
              </Button>
              <Button disabled={busy} variant="secondary" onClick={() => void submit("bad")}>
                לא
              </Button>
            </div>
          </section>
        )}
        <Link href="/employee" className="text-sm text-[var(--accent)] hover:underline">
          חזרה לחיפוש
        </Link>
      </main>
    </div>
  );
}
