"use client";

import { useState } from "react";
import { MatchExplainButton, MatchExplainDrawer } from "@/components/admin/MatchExplainDrawer";

export type AdminMatchListItem = {
  id: string;
  scorePercent: number;
  reason: string;
  status: string;
  meta?: string;
};

export function AdminMatchList(props: { items: AdminMatchListItem[]; emptyHe?: string }) {
  const [explainId, setExplainId] = useState<string | null>(null);
  if (props.items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{props.emptyHe ?? "אין מאצ׳ים."}</p>;
  }
  return (
    <>
      <ul className="space-y-2 text-sm">
        {props.items.map((m) => (
          <li key={m.id} className="panel rounded-xl p-3">
            {m.scorePercent}% · {m.status}
            {m.meta ? ` · ${m.meta}` : ""}
            <p className="mt-1 text-xs text-[var(--muted)]">{m.reason}</p>
            <MatchExplainButton matchId={m.id} onOpen={setExplainId} />
          </li>
        ))}
      </ul>
      <MatchExplainDrawer matchId={explainId} onClose={() => setExplainId(null)} />
    </>
  );
}
