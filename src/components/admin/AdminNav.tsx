"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
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

function NavLink(props: {
  link: (typeof LINKS)[number];
  active: boolean;
  label: string;
  onNavigate?: () => void;
  prefetch: (href: string) => void;
}) {
  return (
    <Link
      href={props.link.href}
      prefetch
      onClick={props.onNavigate}
      onMouseEnter={() => props.prefetch(props.link.href)}
      aria-current={props.active ? "page" : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center rounded-xl border px-3.5 py-2 text-sm transition duration-200 ${
        props.active
          ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--hero)]"
          : "border-[var(--stroke)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)]"
      }`}
    >
      {props.label}
    </Link>
  );
}

export function AdminNav() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const cache = useAdminCache();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const prefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
      const fn = PREFETCH[href];
      if (fn) cache.prefetch(href, fn);
    },
    [cache, router],
  );

  const close = () => setOpen(false);

  return (
    <>
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--hero)]"
          aria-expanded={open}
          aria-controls="admin-nav-sheet"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-lg leading-none" aria-hidden>
            ☰
          </span>
          תפריט מנהל
        </button>
      </div>

      <nav
        className="hidden gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex md:flex-wrap [&::-webkit-scrollbar]:hidden"
        aria-label="ניווט מנהל"
      >
        {LINKS.map((link) => (
          <NavLink
            key={link.href}
            link={link}
            active={isActive(pathname, link)}
            label={t.adminNav[link.labelKey]}
            prefetch={prefetch}
          />
        ))}
      </nav>

      <div
        id="admin-nav-sheet"
        className={`admin-nav-sheet fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-[var(--stroke)] bg-white shadow-2xl transition-transform duration-300 md:hidden ${
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
        role="dialog"
        aria-hidden={!open}
      >
        <div className="mx-auto max-w-lg p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-[var(--hero)]">ניווט</p>
            <button type="button" className="min-h-11 min-w-11 rounded-xl border border-[var(--stroke)]" onClick={close}>
              סגירה
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LINKS.map((link) => (
              <NavLink
                key={link.href}
                link={link}
                active={isActive(pathname, link)}
                label={t.adminNav[link.labelKey]}
                onNavigate={close}
                prefetch={prefetch}
              />
            ))}
          </div>
        </div>
      </div>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="סגירת תפריט"
          onClick={close}
        />
      ) : null}
    </>
  );
}
