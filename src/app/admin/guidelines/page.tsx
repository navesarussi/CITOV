"use client";

import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";

export default function AdminGuidelinesPage() {
  return (
    <AdminShell title="הנחיות מנהל" subtitle="פרומפטים, תיוג, והערכת התאמה">
      <div className="panel space-y-4 rounded-[var(--panel-radius)] p-6 text-sm leading-relaxed">
        <p>
          מסמכי עומק:{" "}
          <code className="rounded bg-[var(--chip)] px-1">docs/PROMPTS.md</code>,{" "}
          <code className="rounded bg-[var(--chip)] px-1">docs/EVAL_MATCHING.md</code>
        </p>
        <ul className="list-disc space-y-2 ps-5">
          <li>עריכת פרומפts בזמן אמת — בדשבורד הראשי (מסך עבודה).</li>
          <li>תיוג התאמות — מינימום 3 תיוגים לפני מטריקות; סף מוצע הוא נקודת פתיחה בלבד.</li>
          <li>ארגז חול מועמד/מעסיק — פרופילי <code>admin-sandbox-*</code>, לא נספרים בסטטיסטיקות.</li>
          <li>תיוג קהל — מסומן <code>source=crowd</code>, נפרד מתיוג מנהל.</li>
        </ul>
        <Link href="/admin" className="text-[var(--accent)] hover:underline">
          ← חזרה לדשבורד
        </Link>
      </div>
    </AdminShell>
  );
}
