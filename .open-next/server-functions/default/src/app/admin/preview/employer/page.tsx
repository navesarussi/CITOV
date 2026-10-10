"use client";

import { AdminShell } from "@/components/AdminShell";
import { EmployerWorkspaceView } from "@/components/workspace/EmployerWorkspaceView";
import { useTranslation } from "@/components/LocaleProvider";

export default function AdminPreviewEmployerPage() {
  const { t } = useTranslation();
  return (
    <AdminShell
      title={t.adminPages.previewEmployerTitle}
      subtitle={t.adminPages.previewEmployerSubtitle}
    >
      <EmployerWorkspaceView layout="embedded" />
    </AdminShell>
  );
}
