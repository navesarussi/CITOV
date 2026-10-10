"use client";

import { AdminPromptStudio } from "@/components/admin/AdminPromptStudio";
import { AdminShell } from "@/components/AdminShell";
import { useTranslation } from "@/components/LocaleProvider";

export default function AdminGuidelinesPage() {
  const { t } = useTranslation();
  return (
    <AdminShell title={t.adminPages.promptsTitle} subtitle={t.adminPages.promptsSubtitle}>
      <AdminPromptStudio />
    </AdminShell>
  );
}
