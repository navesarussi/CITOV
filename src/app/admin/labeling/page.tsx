"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelingPair } from "@/application/admin-labeling";
import {
  LabelingMetricsPanel,
  type LabelingMetricsView,
} from "@/components/admin/labeling/LabelingMetricsPanel";
import { LabelingPairView } from "@/components/admin/LabelingPairView";
import { AdminDataScopeToggle } from "@/components/admin/AdminDataScopeToggle";
import { AdminShell } from "@/components/AdminShell";
import { useTranslation } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import type { RelevanceLabel } from "@/domain/matching-eval/types";

const LABELING_STORAGE_KEY = "citov_admin_labeling_note";

export default function AdminLabelingPage() {
  const { t, fmt } = useTranslation();
  const [pair, setPair] = useState<LabelingPair | null>(null);
  const [metrics, setMetrics] = useState<LabelingMetricsView | null>(null);
  const [note, setNote] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(LABELING_STORAGE_KEY) ?? "";
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadFromResponse = useCallback((data: { pair?: LabelingPair | null; metrics?: LabelingMetricsView }) => {
    setPair(data.pair ?? null);
    setMetrics(data.metrics ?? null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/labeling");
      const data = (await res.json()) as { error?: string; pair?: LabelingPair | null; metrics?: LabelingMetricsView };
      if (!res.ok || data.error) throw new Error(data.error ?? "failed");
      loadFromResponse(data);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [loadFromResponse]);

  const openPair = useCallback(
    async (jobId: string, candidateId: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/admin/labeling?${new URLSearchParams({ jobId, candidateId }).toString()}`,
        );
        const data = (await res.json()) as { error?: string; pair?: LabelingPair | null; metrics?: LabelingMetricsView };
        if (!res.ok || data.error) throw new Error(data.error ?? "failed");
        loadFromResponse(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [loadFromResponse],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    sessionStorage.setItem(LABELING_STORAGE_KEY, note);
  }, [note]);

  const submit = useCallback(
    async (label: RelevanceLabel) => {
      if (!pair || submitting) return;
      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/admin/labeling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: pair.jobId,
            candidateId: pair.candidateId,
            label,
            note,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          pair?: LabelingPair | null;
          metrics?: LabelingMetricsView;
        };
        if (!res.ok || data.error) throw new Error(data.error ?? "failed");
        loadFromResponse(data);
        setNote("");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    },
    [pair, submitting, note, loadFromResponse],
  );

  useEffect(() => {
    if (!pair || submitting) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "1") void submit("good");
      if (e.key === "2") void submit("acceptable");
      if (e.key === "3") void submit("bad");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pair, submitting, submit]);

  async function applySuggestedThreshold() {
    const threshold = metrics?.suggestedThreshold;
    if (threshold == null || submitting) return;
    const previewRes = await fetch("/api/admin/labeling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "previewThreshold", threshold }),
    });
    const previewData = (await previewRes.json()) as {
      error?: string;
      preview?: {
        currentThreshold: number;
        newThreshold: number;
        labeledPairs: number;
        queuedBefore: number;
        queuedAfter: number;
        agreementBefore: number;
        agreementAfter: number;
      };
    };
    if (!previewRes.ok || previewData.error || !previewData.preview) {
      setError(previewData.error ?? "לא ניתן לחשב תצוגה מקדימה");
      return;
    }
    const p = previewData.preview;
    if (
      !confirm(
        fmt(t.adminLabeling.applyThresholdConfirm, {
          current: p.currentThreshold.toFixed(2),
          suggested: p.newThreshold.toFixed(2),
          count: String(p.labeledPairs),
          queuedBefore: String(p.queuedBefore),
          queuedAfter: String(p.queuedAfter),
          agreementBefore: String(p.agreementBefore),
          agreementAfter: String(p.agreementAfter),
        }),
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/labeling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "applyThreshold", threshold }),
      });
      const data = (await res.json()) as { error?: string; metrics?: LabelingMetricsView };
      if (!res.ok || data.error) throw new Error(data.error ?? "failed");
      setMetrics(data.metrics ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell title={t.adminLabeling.pageTitle} subtitle={t.adminLabeling.pageSubtitle}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AdminDataScopeToggle onChange={() => void refresh()} />
        </div>
        {metrics ? (
          <LabelingMetricsPanel
            metrics={metrics}
            submitting={submitting}
            onApplyThreshold={() => void applySuggestedThreshold()}
            onOpenPair={(jobId, candidateId) => void openPair(jobId, candidateId)}
          />
        ) : null}

        {error ? (
          <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
        ) : null}

        {loading && !pair ? (
          <p className="text-sm text-[var(--muted)]">{t.adminLabeling.loading}</p>
        ) : !pair ? (
          <p className="text-sm text-[var(--muted)]">{t.adminLabeling.noPairs}</p>
        ) : (
          <LabelingPairView pair={pair} />
        )}

        {pair ? (
          <section className="panel sticky bottom-0 z-10 space-y-3 rounded-[var(--panel-radius)] border border-[var(--stroke)] bg-[var(--surface)]/95 p-4 backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <textarea
              className="w-full rounded-xl border border-[var(--stroke)] p-3 text-sm"
              rows={3}
              placeholder={t.adminLabeling.notePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-xs text-[var(--muted)]">{t.adminLabeling.shortcutHint}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                className="min-h-12 text-base"
                disabled={submitting}
                onClick={() => void submit("good")}
              >
                {t.adminLabeling.submitGood} <kbd className="ms-2 rounded bg-[var(--chip)] px-1.5 text-xs">1</kbd>
              </Button>
              <Button
                className="min-h-12 text-base"
                disabled={submitting}
                variant="secondary"
                onClick={() => void submit("acceptable")}
              >
                {t.adminLabeling.submitAcceptable}{" "}
                <kbd className="ms-2 rounded bg-[var(--chip)] px-1.5 text-xs">2</kbd>
              </Button>
              <Button
                className="min-h-12 text-base"
                disabled={submitting}
                variant="secondary"
                onClick={() => void submit("bad")}
              >
                {t.adminLabeling.submitBad} <kbd className="ms-2 rounded bg-[var(--chip)] px-1.5 text-xs">3</kbd>
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}
