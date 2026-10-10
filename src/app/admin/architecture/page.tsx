"use client";

import { AdminShell } from "@/components/AdminShell";
import { ArchitectureExplorer } from "@/components/admin/ArchitectureExplorer";
import { useTranslation } from "@/components/LocaleProvider";

export default function AdminArchitecturePage() {
  const { t } = useTranslation();
  return (
    <AdminShell wide title={t.adminPages.architectureTitle} subtitle={t.adminPages.architectureSubtitle}>
      <ArchitectureExplorer />
    </AdminShell>
  );
}
