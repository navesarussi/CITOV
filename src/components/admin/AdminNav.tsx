"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; match?: (path: string) => boolean }[] = [
  { href: "/admin", label: "דשבורד", match: (p) => p === "/admin" },
  { href: "/admin/candidates", label: "מועמדים" },
  { href: "/admin/employers", label: "מעסיקים" },
  { href: "/admin/labeling", label: "תיוג התאמות" },
  { href: "/admin/preview/employee", label: "תצוגת מועמד" },
  { href: "/admin/preview/employer", label: "תצוגת מעסיק" },
  { href: "/admin/guidelines", label: "הנחיות" },
];

function isActive(pathname: string, link: (typeof LINKS)[number]): boolean {
  if (link.match) return link.match(pathname);
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap gap-2" aria-label="ניווט מנהל">
      {LINKS.map((link) => {
        const active = isActive(pathname, link);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-9 items-center rounded-xl border px-3 py-1.5 text-sm transition duration-200 ${
              active
                ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--hero)]"
                : "border-[var(--stroke)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
