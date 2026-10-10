"use client";

import { AdminShell } from "@/components/AdminShell";
import { EmployeeWorkspaceView } from "@/components/workspace/EmployeeWorkspaceView";

export default function AdminPreviewEmployeePage() {
  return (
    <AdminShell
      title="תצוגת מועמד"
      subtitle="החוויה המלאה שלך כמועמד — קו״ח, צ'אט, כרטיס והזדמנויות (נתונים אמיתיים)"
    >
      <EmployeeWorkspaceView layout="embedded" />
    </AdminShell>
  );
}
