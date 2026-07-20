"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/components/LocaleProvider";

export function FlexibilitySlider(props: {
  userId: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(clamp(props.value));
  const [saving, setSaving] = useState(false);
  const pending = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(clamp(props.value));
  }, [props.value]);

  function scheduleSave(next: number) {
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, 280);
  }

  async function flush() {
    const value = pending.current;
    pending.current = null;
    if (value == null) return;
    setSaving(true);
    try {
      const res = await fetch("/api/flexibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: props.userId, value }),
      });
      const data = (await res.json()) as { flexibility?: number; error?: string };
      if (data.flexibility != null) {
        props.onChange(data.flexibility);
        setLocal(data.flexibility);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
        <span>{t.flexibility.title}</span>
        <span>
          {local}/10
          {saving ? "…" : ""}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={local}
        aria-label={t.flexibility.title}
        onChange={(e) => {
          const next = clamp(Number(e.target.value));
          setLocal(next);
          props.onChange(next);
          scheduleSave(next);
        }}
        style={{ ["--pct"]: `${((local - 1) / 9) * 100}%` } as React.CSSProperties}
        className="range focus-ring"
      />
      <div className="mt-1 flex justify-between text-[10px] leading-4 text-[var(--muted)]">
        <span>{t.flexibility.veryFlexible}</span>
        <span>{t.flexibility.exactOnly}</span>
      </div>
      <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">{t.flexibility.hint}</p>
    </div>
  );
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(10, Math.round(value)));
}
