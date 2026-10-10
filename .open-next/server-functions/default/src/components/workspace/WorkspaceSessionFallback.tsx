"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";

export function WorkspaceSessionFallback(props: {
  loading: boolean;
  syncError: string | null;
  onRetry: () => void;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const { status } = useSession();

  if (props.loading) {
    return (
      <p className="text-sm text-[var(--muted)]">{t.session.loading}</p>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm">
        <p className="mb-2 text-[var(--hero)]">נדרשת התחברות עם Google כדי לפתוח את תצוגת העבודה.</p>
        <Link
          href="/api/auth/signin"
          className="inline-flex min-h-10 items-center rounded-lg bg-[var(--hero)] px-4 text-sm font-medium text-white"
        >
          התחברות
        </Link>
      </div>
    );
  }

  if (props.syncError) {
    return (
      <div className="rounded-xl border border-[var(--warn)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn)]">
        <p className="mb-2">{props.syncError}</p>
        <Button variant="secondary" className="min-h-9" onClick={props.onRetry}>
          נסו שוב
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm">
      <p className="mb-2 text-[var(--muted)]">לא ניתן לטעון את פרופיל העבודה.</p>
      <Button variant="secondary" className="min-h-9" onClick={props.onRetry}>
        נסו שוב
      </Button>
    </div>
  );
}
