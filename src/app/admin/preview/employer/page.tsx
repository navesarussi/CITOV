"use client";

import { AdminSandboxEmployer } from "@/components/admin/AdminSandboxEmployer";
import { AdminShell } from "@/components/AdminShell";

export default function AdminPreviewEmployerPage() {
  return (
    <AdminShell
      title="תצוגת מעסיק (מנהל)"
      subtitle="ארגז חול — חברה, משרות, צ'אט וכרטיס משרה"
    >
      <AdminSandboxEmployer />
    </AdminShell>
  );
}
