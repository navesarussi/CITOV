"use client";

import { useEffect, useState } from "react";

type Budget = {
  warn: boolean;
  blocked: boolean;
  reason: string | null;
  dailySpendUsd: number;
  monthlySpendUsd: number;
  dailyCapUsd: number;
  monthlyCapUsd: number;
};

export function AdminBudgetBanner() {
  const [budget, setBudget] = useState<Budget | null>(null);

  useEffect(() => {
    void fetch("/api/admin/monitoring")
      .then((r) => r.json())
      .then((d: { dashboard?: { aiBudget: Budget } }) => {
        if (d.dashboard?.aiBudget) setBudget(d.dashboard.aiBudget);
      })
      .catch(() => undefined);
  }, []);

  if (!budget || (!budget.warn && !budget.blocked)) return null;

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        budget.blocked
          ? "border-rose-300 bg-rose-50 text-rose-950"
          : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
      role="status"
    >
      <p className="font-semibold">{budget.blocked ? "תקציב AI — חסימה" : "תקציב AI — אזהרה"}</p>
      <p className="mt-1">
        {budget.reason ?? "קרוב לתקרת התקציב"} · היום ${budget.dailySpendUsd.toFixed(2)}
        {budget.dailyCapUsd > 0 ? ` / $${budget.dailyCapUsd.toFixed(2)}` : ""} · החודש $
        {budget.monthlySpendUsd.toFixed(2)}
        {budget.monthlyCapUsd > 0 ? ` / $${budget.monthlyCapUsd.toFixed(2)}` : ""}
      </p>
      {budget.blocked ? (
        <p className="mt-1 text-xs">המערכת עוברת ל-heuristic עד איפוס התקציב או העלאת CAP.</p>
      ) : null}
    </div>
  );
}
