"use client";

import { AdminPromptStudio } from "@/components/admin/AdminPromptStudio";
import { AdminShell } from "@/components/AdminShell";

export default function AdminGuidelinesPage() {
  return (
    <AdminShell title="פרומפטים" subtitle="עריכת הנחיות הסוכן, גרסאות, ותצוגה מקדימה">
      <AdminPromptStudio />
    </AdminShell>
  );
}
