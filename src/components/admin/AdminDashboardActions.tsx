"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function AdminDashboardActions(props: {
  seeding: boolean;
  backfilling: boolean;
  onSeed: () => void;
  onBackfill: () => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex shrink-0 items-center gap-1">
      <div className="hidden flex-wrap items-center justify-end gap-1 sm:flex">
        <Button
          variant="secondary"
          disabled={props.seeding}
          onClick={props.onSeed}
          className="min-h-9 px-3 py-1.5 text-sm"
        >
          {props.seeding ? "טוען דמו…" : "טעינת דמו"}
        </Button>
        <Button
          variant="secondary"
          disabled={props.backfilling}
          onClick={props.onBackfill}
          className="min-h-9 px-3 py-1.5 text-sm"
        >
          {props.backfilling ? "מעדכן…" : "עדכון אינדקס התאמות"}
        </Button>
        <Button variant="secondary" onClick={props.onRefresh} className="min-h-9 px-3 py-1.5 text-sm">
          רענון
        </Button>
      </div>
      <div className="sm:hidden">
        <Button
          type="button"
          variant="secondary"
          className="min-h-9 px-3 text-sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          פעולות ▾
        </Button>
        {open ? (
          <div className="absolute end-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-[var(--stroke)] bg-white p-1 shadow-lg">
            <button
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-[var(--chip)]"
              disabled={props.seeding}
              onClick={() => {
                setOpen(false);
                props.onSeed();
              }}
            >
              {props.seeding ? "טוען דמו…" : "טעינת דמו"}
            </button>
            <button
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-[var(--chip)]"
              disabled={props.backfilling}
              onClick={() => {
                setOpen(false);
                props.onBackfill();
              }}
            >
              {props.backfilling ? "מעדכן…" : "עדכון אינדקס התאמות"}
            </button>
            <button
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-[var(--chip)]"
              onClick={() => {
                setOpen(false);
                props.onRefresh();
              }}
            >
              רענון
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
