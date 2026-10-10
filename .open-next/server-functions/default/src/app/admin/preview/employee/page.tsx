"use client";

import { AdminShell } from "@/components/AdminShell";
import { EmployeeWorkspaceView } from "@/components/workspace/EmployeeWorkspaceView";
import { useTranslation } from "@/components/LocaleProvider";

export default function AdminPreviewEmployeePage() {
  const { t } = useTranslation();
  return (
    <AdminShell
      title={t.adminPages.previewEmployeeTitle}
      subtitle={t.adminPages.previewEmployeeSubtitle}
    >
      <EmployeeWorkspaceView layout="embedded" />
    </AdminShell>
  );
}
