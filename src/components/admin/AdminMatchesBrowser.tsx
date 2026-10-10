"use client";

import { useCallback, useMemo, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import type { AdminMatchFilter, AdminMatchRow } from "@/application/admin-matches-browse";
import { AdminDataScopeToggle } from "@/components/admin/AdminDataScopeToggle";
import { AdminMatchEntitySelect } from "@/components/admin/AdminMatchEntitySelect";
import { MatchExplainDrawer } from "@/components/admin/MatchExplainDrawer";

const FILTER_LABELS: Record<AdminMatchFilter, string> = {
  queued: "בתור",
  approved: "אושרו",
  rejected: "נדחו",
  below_threshold: "מתחת לסף",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "בתור",
  approved: "אושר",
  rejected: "נדח",
  below_threshold: "מתחת לסף",
};

export function AdminMatchesBrowser(props: {
  initialJobId?: string;
  initialCandidateId?: string;
}) {
  const [filter, setFilter] = useState<AdminMatchFilter>("queued");
  const [q, setQ] = useState("");
  const [jobId, setJobId] = useState(props.initialJobId ?? "");
  const [candidateId, setCandidateId] = useState(props.initialCandidateId ?? "");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminMatchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [explainId, setExplainId] = useState<string | null>(null);
  const [scopeTick, setScopeTick] = useState(0);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("filter", filter);
    p.set("page", String(page));
    p.set("pageSize", "25");
    p.set("sort", "score_desc");
    if (q.trim()) p.set("q", q.trim());
    if (jobId.trim()) p.set("jobId", jobId.trim());
    if (candidateId.trim()) p.set("candidateId", candidateId.trim());
    return p.toString();
  }, [filter, page, q, jobId, candidateId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/matches?${queryString}`);
      const data = (await res.json()) as {
        error?: string;
        rows?: AdminMatchRow[];
        total?: number;
        hint?: string;
      };
      if (!res.ok || data.error) throw new Error(data.error ?? "failed");
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setHint(data.hint ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useDeferredEffect(() => {
    void load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-3" data-testid="admin-matches-browser">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdminDataScopeToggle
          onChange={() => {
            setScopeTick((n) => n + 1);
            void load();
          }}
        />
        <p className="text-xs text-[var(--muted)]">{total} התאמות</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(FILTER_LABELS) as AdminMatchFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            data-testid={`match-filter-${f}`}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
              filter === f
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--hero)]"
                : "border-[var(--stroke)] text-[var(--muted)]"
            }`}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <input
          className="rounded-lg border border-[var(--stroke)] px-2.5 py-2 text-sm sm:col-span-1"
          placeholder="חיפוש משרה / מועמד"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <AdminMatchEntitySelect
          key={`job-${scopeTick}`}
          kind="job"
          placeholder="בחירת משרה (לסף / סינון)"
          value={jobId}
          onChange={(id) => {
            setJobId(id);
            setPage(1);
          }}
        />
        <AdminMatchEntitySelect
          key={`cand-${scopeTick}`}
          kind="candidate"
          placeholder="בחירת מועמד/ת (לסף / סינון)"
          value={candidateId}
          onChange={(id) => {
            setCandidateId(id);
            setPage(1);
          }}
        />
      </div>

      {hint ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
      {error ? (
        <p className="rounded-lg bg-[var(--warn-bg)] px-2.5 py-2 text-sm text-[var(--warn)]">{error}</p>
      ) : null}

      {loading && rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">טוען…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">אין התאמות בסינון הזה.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.matchId}>
              <button
                type="button"
                data-testid="admin-match-row"
                className="w-full rounded-xl border border-[var(--stroke)] bg-white/95 p-2.5 text-right text-sm shadow-sm transition active:scale-[0.99]"
                onClick={() => setExplainId(row.matchId)}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--hero)]">{row.jobTitle}</p>
                    <p className="text-xs text-[var(--muted)]">{row.employerName}</p>
                    <p className="mt-1 text-xs">{row.candidateLabel}</p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-base font-bold text-[var(--accent)]">{row.scorePercent}%</p>
                    <p className="text-[10px] text-[var(--muted)]">
                      {STATUS_LABEL[row.status] ?? row.status}
                    </p>
                  </div>
                </div>
                {row.topReasons.length ? (
                  <ul className="mt-2 space-y-0.5 text-[11px] leading-snug text-[var(--muted)]">
                    {row.topReasons.map((t) => (
                      <li key={t}>• {t}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-[10px] font-medium text-[var(--accent)]">למה ההתאמה הזו? ←</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            className="rounded-lg border border-[var(--stroke)] px-3 py-1 text-xs disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            הקודם
          </button>
          <span className="text-xs text-[var(--muted)]">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            className="rounded-lg border border-[var(--stroke)] px-3 py-1 text-xs disabled:opacity-40"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            הבא
          </button>
        </div>
      ) : null}

      <MatchExplainDrawer matchId={explainId} onClose={() => setExplainId(null)} mobileAboveTabs />
    </div>
  );
}
