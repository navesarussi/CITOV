"use client";

import { useCallback, useState } from "react";
import { useDeferredEffect } from "@/lib/deferred-effect";
import type { AdminMatchPickerOption } from "@/application/admin-matches-browse";

export function AdminMatchEntitySelect(props: {
  kind: "job" | "candidate";
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [options, setOptions] = useState<AdminMatchPickerOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/match-pickers");
      const data = (await res.json()) as {
        jobs?: AdminMatchPickerOption[];
        candidates?: AdminMatchPickerOption[];
      };
      setOptions(props.kind === "job" ? (data.jobs ?? []) : (data.candidates ?? []));
    } finally {
      setLoading(false);
    }
  }, [props.kind]);

  useDeferredEffect(() => {
    void load();
  }, [load]);

  return (
    <select
      className="w-full rounded-lg border border-[var(--stroke)] bg-white px-2.5 py-2 text-sm"
      value={props.value}
      disabled={loading}
      onChange={(e) => props.onChange(e.target.value)}
      aria-label={props.placeholder}
    >
      <option value="">{loading ? "טוען…" : props.placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
