"use client";

import { useSearchParams } from "next/navigation";
import { AdminMatchesBrowser } from "@/components/admin/AdminMatchesBrowser";
import { AdminShell } from "@/components/AdminShell";
import { useTranslation } from "@/components/LocaleProvider";

export default function AdminMatchesPage() {
  const { t } = useTranslation();
  const sp = useSearchParams();
  const jobId = sp.get("jobId") ?? undefined;
  const candidateId = sp.get("candidateId") ?? undefined;

  return (
    <AdminShell
      title={t.adminPages.matchesTitle}
      subtitle={t.adminPages.matchesSubtitle}
      wide
    >
      <AdminMatchesBrowser initialJobId={jobId} initialCandidateId={candidateId} />
    </AdminShell>
  );
}
