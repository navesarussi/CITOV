"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminCache } from "@/components/admin/AdminCacheProvider";
import { useTranslation } from "@/components/LocaleProvider";

type AdminNavKey =
  | "dashboard"
  | "candidates"
  | "employers"
  | "labeling"
  | "sandboxReport"
  | "architecture"
  | "monitoring"
  | "previewEmployee"
  | "previewEmployer"
  | "prompts";

const LINKS: { href: string; labelKey: AdminNavKey; match?: (path: string) => boolean }[] = [
  { href: "/admin", labelKey: "dashboard", match: (p) => p === "/admin" },
  { href: "/admin/architecture", labelKey: "architecture" },
  { href: "/admin/candidates", labelKey: "candidates" },
  { href: "/admin/employers", labelKey: "employers" },
  { href: "/admin/labeling", labelKey: "labeling" },
  { href: "/admin/sandbox-report", labelKey: "sandboxReport" },
  { href: "/admin/monitoring", labelKey: "monitoring" },
  { href: "/admin/preview/employee", labelKey: "previewEmployee" },
  { href: "/admin/preview/employer", labelKey: "previewEmployer" },
  { href: "/admin/guidelines", labelKey: "prompts" },
];

function isActive(pathname: string, link: (typeof LINKS)[number]): boolean {
  if (link.match) return link.match(pathname);
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

const PREFETCH: Record<string, () => Promise<unknown>> = {
  "/admin": () => fetch("/api/admin/stats").then((r) => r.json()),
  "/admin/architecture": () => fetch("/api/admin/architecture").then((r) => r.json()),
  "/admin/labeling": () => fetch("/api/admin/labeling").then((r) => r.json()),
  "/admin/candidates": () => fetch("/api/admin/candidates").then((r) => r.json()),
  "/admin/employers": () => fetch("/api/admin/employers").then((r) => r.json()),
  "/admin/monitoring": () => fetch("/api/admin/monitoring").then((r) => r.json()),
  "/admin/guidelines": () => fetch("/api/admin/prompt-catalog").then((r) => r.json()),
};

export function AdminNav() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const cache = useAdminCache();
  const { t } = useTranslation();
  return (
    <nav className="flex flex-wrap gap-2" aria-label="ניווט מנהל">
      {LINKS.map((link) => {
        const active = isActive(pathname, link);
        const label = t.adminNav[link.labelKey];
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            onMouseEnter={() => {
              router.prefetch(link.href);
              const fn = PREFETCH[link.href];
              if (fn) cache.prefetch(link.href, fn);
            }}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-9 items-center rounded-xl border px-3 py-1.5 text-sm transition duration-200 ${
              active
                ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--hero)]"
                : "border-[var(--stroke)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
