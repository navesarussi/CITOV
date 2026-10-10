"use client";

import { AdminSandboxEmployee } from "@/components/admin/AdminSandboxEmployee";
import { AdminShell } from "@/components/AdminShell";

export default function AdminPreviewEmployeePage() {
  return (
    <AdminShell
      title="תצוגת מועמד (מנהל)"
      subtitle="ארגז חול — התנהגות כמו מועמד אמיתי (קו״ח, צ'אט, כרטיס)"
    >
      <AdminSandboxEmployee />
    </AdminShell>
  );
}
