"use client";

import { useCallback, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import type { AdminAiUsageDashboard } from "@/application/admin-ai-usage";
import { Button } from "@/components/ui/Button";

function usd(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function AdminAiUsagePanel() {
  const [data, setData] = useState<AdminAiUsageDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-usage", { cache: "no-store" });
      const json = (await res.json()) as { error?: string; dashboard?: AdminAiUsageDashboard };
      if (!res.ok || !json.dashboard) throw new Error(json.error ?? "failed");
      setData(json.dashboard);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useDeferredEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return <p className="text-sm text-[var(--muted)]">טוען עלויות AI…</p>;
  }
  if (error && !data) {
    return (
      <p className="rounded-xl bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">{error}</p>
    );
  }
  if (!data) return null;

  const maxDay = Math.max(...data.byDay.map((d) => d.costUsd), 0.0001);
  const b = data.budget;

  return (
    <section className="panel space-y-5 rounded-[var(--panel-radius)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[var(--hero)]">עלויות בינה מלאכותית — פירוט</h2>
          <p className="text-xs text-[var(--muted)]">מתעדכן אוטומטית כל 30 שניות · מקור: טבלת ai_usage</p>
        </div>
        <Button variant="secondary" className="min-h-9" onClick={() => void load()}>
          רענון
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="היום" value={usd(data.totals.todayUsd)} sub={`${data.totals.todayCalls} קריאות`} />
        <Stat label="7 ימים" value={usd(data.totals.last7dUsd)} sub={`${data.totals.last7dCalls} קריאות`} />
        <Stat label="החודש" value={usd(data.totals.monthUsd)} sub={`${data.totals.monthCalls} קריאות`} />
        <Stat label="מצטבר (120 יום)" value={usd(data.totals.allTimeUsd)} sub={`${data.tokens.total.toLocaleString("he-IL")} טוקנים`} />
      </div>

      <div className="rounded-xl border border-[var(--stroke)] bg-white/90 p-4">
        <p className="text-sm font-semibold text-[var(--hero)]">תקציב AI</p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--chip)]">
          <div
            className={`h-full rounded-full ${b.blocked ? "bg-rose-500" : b.warn ? "bg-amber-500" : "bg-[var(--accent)]"}`}
            style={{
              width: `${Math.min(100, b.monthlyCapUsd > 0 ? (b.monthlySpendUsd / b.monthlyCapUsd) * 100 : b.dailyCapUsd > 0 ? (b.dailySpendUsd / b.dailyCapUsd) * 100 : 8)}%`,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          היום {usd(b.dailySpendUsd)}
          {b.dailyCapUsd > 0 ? ` / ${usd(b.dailyCapUsd)}` : ""} · החודש {usd(b.monthlySpendUsd)}
          {b.monthlyCapUsd > 0 ? ` / ${usd(b.monthlyCapUsd)}` : ""}
          {b.blocked ? " · חסימת Gemini פעילה" : b.warn ? " · אזהרה 80%" : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="לפי יכולת">
          <ul className="space-y-2 text-sm">
            {data.byFeature.map((row) => (
              <li key={row.key} className="flex justify-between gap-2 border-b border-[var(--stroke)] pb-1">
                <span>{row.label}</span>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {usd(row.costUsd)} · {row.calls} · {row.tokens.toLocaleString("he-IL")} tok
                </span>
              </li>
            ))}
          </ul>
        </Block>
        <Block title="לפי מודל">
          <ul className="space-y-2 text-sm">
            {data.byModel.map((row) => (
              <li key={row.model} className="flex justify-between gap-2 border-b border-[var(--stroke)] pb-1">
                <span className="font-mono text-xs">{row.model}</span>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {usd(row.costUsd)} · {row.calls}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="טוקני קלט" value={data.tokens.input.toLocaleString("he-IL")} />
        <Stat label="טוקני פלט" value={data.tokens.output.toLocaleString("he-IL")} />
        <Stat
          label="חיסכון cache (משוער)"
          value={usd(data.cacheSavingsUsd)}
          sub={`${data.tokens.cached.toLocaleString("he-IL")} cached`}
        />
      </div>

      {data.avgCostPerChatCallUsd != null ? (
        <p className="text-sm text-[var(--muted)]">
          עלות ממוצעת לקריאת צ&apos;אט (כולל חילוץ + תשובה):{" "}
          <strong className="text-[var(--hero)]">{usd(data.avgCostPerChatCallUsd)}</strong>
        </p>
      ) : null}

      <Block title="מגמה יומית (עלות $)">
        <div className="flex h-28 items-end gap-1">
          {[...data.byDay].reverse().map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-[18px] rounded-t bg-[var(--accent)]/80"
                style={{ height: `${Math.max(4, (d.costUsd / maxDay) * 100)}%` }}
                title={`${d.day}: ${usd(d.costUsd)}`}
              />
              <span className="text-[9px] text-[var(--muted)]">{d.day.slice(5)}</span>
            </div>
          ))}
        </div>
      </Block>

      {data.topUsers.length > 0 ? (
        <Block title="משתמשים מובילים (עלות)">
          <ul className="space-y-1 text-sm">
            {data.topUsers.map((u) => (
              <li key={u.userId} className="flex justify-between gap-2">
                <span>{u.name}</span>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {usd(u.costUsd)} · {u.calls}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title="50 קריאות אחרונות">
        <div className="max-h-80 overflow-auto">
          <table className="admin-table-cards w-full text-left text-xs">
            <thead className="sticky top-0 bg-white text-[var(--muted)]">
              <tr>
                <th className="py-1 pe-2">זמן</th>
                <th className="py-1 pe-2">סוג</th>
                <th className="py-1 pe-2">מודל</th>
                <th className="py-1 pe-2">in/out</th>
                <th className="py-1 pe-2">$</th>
                <th className="py-1">מילישניות</th>
              </tr>
            </thead>
            <tbody>
              {data.recentCalls.map((r) => (
                <tr key={r.id} className="border-t border-[var(--stroke)]">
                  <td data-label="זמן" className="py-1 pe-2 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString("he-IL")}
                  </td>
                  <td data-label="סוג" className="py-1 pe-2">
                    {r.type}
                  </td>
                  <td data-label="מודל" className="py-1 pe-2 font-mono">
                    {r.model ?? "—"}
                  </td>
                  <td data-label="טוקנים" className="py-1 pe-2 font-mono">
                    {r.promptTokens}/{r.completionTokens}
                    {(r.cachedPromptTokens ?? 0) > 0 ? ` (+${r.cachedPromptTokens} c)` : ""}
                  </td>
                  <td data-label="עלות" className="py-1 pe-2 font-mono">
                    {usd(r.estimatedCostUsd)}
                  </td>
                  <td data-label="זמן תגובה" className="py-1">
                    {r.latencyMs ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
    </section>
  );
}

function Stat(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--stroke)] bg-white/90 p-3">
      <p className="text-xs text-[var(--muted)]">{props.label}</p>
      <p className="mt-1 text-lg font-bold text-[var(--hero)]">{props.value}</p>
      {props.sub ? <p className="text-[10px] text-[var(--muted)]">{props.sub}</p> : null}
    </div>
  );
}

function Block(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--stroke)] bg-white/90 p-4">
      <h3 className="text-sm font-semibold text-[var(--hero)]">{props.title}</h3>
      <div className="mt-3">{props.children}</div>
    </div>
  );
}
