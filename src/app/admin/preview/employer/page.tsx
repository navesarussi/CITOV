"use client";

import { AdminShell } from "@/components/AdminShell";
import { EmployerWorkspaceView } from "@/components/workspace/EmployerWorkspaceView";

export default function AdminPreviewEmployerPage() {
  return (
    <AdminShell
      title="תצוגת מעסיק"
      subtitle="החוויה המלאה שלך כמעסיק — חברה, משרות, צ'אט, התאמות ואישור/דחייה (נתונים אמיתיים)"
    >
      <EmployerWorkspaceView layout="embedded" />
    </AdminShell>
  );
}
