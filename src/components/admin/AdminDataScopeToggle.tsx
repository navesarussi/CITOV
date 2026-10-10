"use client";

import { useEffect, useState } from "react";
import type { AdminDataScope } from "@/domain/test-sandbox";

export function AdminDataScopeToggle(props: { onChange?: (scope: AdminDataScope) => void }) {
  const [scope, setScope] = useState<AdminDataScope>("real");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/data-scope")
      .then((r) => r.json())
      .then((d: { scope?: AdminDataScope }) => {
        if (d.scope === "test" || d.scope === "real") setScope(d.scope);
      })
      .catch(() => undefined);
  }, []);

  async function set(next: AdminDataScope) {
    if (busy || next === scope) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/data-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: next }),
      });
      const d = (await res.json()) as { scope?: AdminDataScope };
      const applied = d.scope === "test" ? "test" : "real";
      setScope(applied);
      props.onChange?.(applied);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex rounded-lg border border-[var(--stroke)] p-0.5 text-xs">
      <button
        type="button"
        disabled={busy}
        className={`rounded-md px-3 py-1.5 ${scope === "real" ? "bg-[var(--accent-soft)] font-semibold" : ""}`}
        onClick={() => void set("real")}
      >
        נתונים אמיתיים
      </button>
      <button
        type="button"
        disabled={busy}
        className={`rounded-md px-3 py-1.5 ${scope === "test" ? "bg-[var(--accent-soft)] font-semibold" : ""}`}
        onClick={() => void set("test")}
      >
        נתוני בדיקה
      </button>
    </div>
  );
}
