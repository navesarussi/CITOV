"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAdminCache } from "@/components/admin/AdminCacheProvider";
import { useTranslation } from "@/components/LocaleProvider";

type AdminNavKey =
  | "dashboard"
  | "matches"
  | "candidates"
  | "employers"
  | "labeling"
  | "sandboxReport"
  | "architecture"
  | "monitoring"
  | "previewEmployee"
  | "previewEmployer"
  | "prompts";

type NavLinkDef = {
  href: string;
  labelKey: AdminNavKey;
  shortHe: string;
  match?: (path: string) => boolean;
};

const ALL_LINKS: NavLinkDef[] = [
  { href: "/admin", labelKey: "dashboard", shortHe: "דשבורד", match: (p) => p === "/admin" },
  { href: "/admin/matches", labelKey: "matches", shortHe: "התאמות" },
  { href: "/admin/labeling", labelKey: "labeling", shortHe: "תיוג" },
  { href: "/admin/monitoring", labelKey: "monitoring", shortHe: "ניטור" },
  { href: "/admin/architecture", labelKey: "architecture", shortHe: "ארכ׳" },
  { href: "/admin/candidates", labelKey: "candidates", shortHe: "מועמדים" },
  { href: "/admin/employers", labelKey: "employers", shortHe: "מעסיקים" },
  { href: "/admin/sandbox-report", labelKey: "sandboxReport", shortHe: "דוח הרצה" },
  { href: "/admin/preview/employee", labelKey: "previewEmployee", shortHe: "תצוגת מועמד" },
  { href: "/admin/preview/employer", labelKey: "previewEmployer", shortHe: "תצוגת מעסיק" },
  { href: "/admin/guidelines", labelKey: "prompts", shortHe: "פרומפטים" },
];

const MAIN_TAB_HREFS = [
  "/admin",
  "/admin/matches",
  "/admin/labeling",
  "/admin/monitoring",
] as const;

const MORE_LINKS = ALL_LINKS.filter((l) => !MAIN_TAB_HREFS.includes(l.href as (typeof MAIN_TAB_HREFS)[number]));

function isActive(pathname: string, link: NavLinkDef): boolean {
  if (link.match) return link.match(pathname);
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

const PREFETCH: Record<string, () => Promise<unknown>> = {
  "/admin": () => fetch("/api/admin/stats").then((r) => r.json()),
  "/admin/matches": () => fetch("/api/admin/matches?filter=queued&page=1").then((r) => r.json()),
  "/admin/architecture": () => fetch("/api/admin/architecture").then((r) => r.json()),
  "/admin/labeling": () => fetch("/api/admin/labeling").then((r) => r.json()),
  "/admin/candidates": () => fetch("/api/admin/candidates").then((r) => r.json()),
  "/admin/employers": () => fetch("/api/admin/employers").then((r) => r.json()),
  "/admin/monitoring": () => fetch("/api/admin/monitoring").then((r) => r.json()),
  "/admin/guidelines": () => fetch("/api/admin/prompt-catalog").then((r) => r.json()),
};

function NavLink(props: {
  link: NavLinkDef;
  active: boolean;
  label: string;
  onNavigate?: () => void;
  prefetch: (href: string) => void;
  className?: string;
}) {
  return (
    <Link
      href={props.link.href}
      prefetch
      onClick={props.onNavigate}
      onMouseEnter={() => props.prefetch(props.link.href)}
      aria-current={props.active ? "page" : undefined}
      data-testid={`admin-nav-${props.link.labelKey}`}
      className={
        props.className ??
        `inline-flex min-h-10 shrink-0 items-center rounded-xl border px-3 py-1.5 text-sm transition duration-200 ${
          props.active
            ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--hero)]"
            : "border-[var(--stroke)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)]"
        }`
      }
    >
      {props.label}
    </Link>
  );
}

function useAdminPrefetch() {
  const router = useRouter();
  const cache = useAdminCache();
  return useCallback(
    (href: string) => {
      router.prefetch(href);
      const fn = PREFETCH[href];
      if (fn) cache.prefetch(href, fn);
    },
    [cache, router],
  );
}

export function AdminNavDesktop() {
  const pathname = usePathname() ?? "";
  const { t } = useTranslation();
  const prefetch = useAdminPrefetch();

  return (
    <nav
      className="hidden gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex md:flex-wrap [&::-webkit-scrollbar]:hidden"
      aria-label="ניווט מנהל"
    >
      {ALL_LINKS.map((link) => (
        <NavLink
          key={link.href}
          link={link}
          active={isActive(pathname, link)}
          label={t.adminNav[link.labelKey]}
          prefetch={prefetch}
        />
      ))}
    </nav>
  );
}

export function AdminNavMobileBar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { t } = useTranslation();
  const prefetch = useAdminPrefetch();
  const [moreOpen, setMoreOpen] = useState(false);

  const mainTabs = ALL_LINKS.filter((l) =>
    MAIN_TAB_HREFS.includes(l.href as (typeof MAIN_TAB_HREFS)[number]),
  );

  const moreActive = MORE_LINKS.some((l) => isActive(pathname, l));

  const closeMore = useCallback(() => setMoreOpen(false), []);

  const go = (href: string) => {
    closeMore();
    prefetch(href);
    router.push(href);
  };

  return (
    <>
      <nav
        className="admin-tab-bar fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--stroke)] bg-white/98 backdrop-blur-md md:hidden"
        aria-label="ניווט מנהל — תחתון"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-0 px-0.5 pt-0.5">
          {mainTabs.map((link) => {
            const active = isActive(pathname, link);
            return (
              <li key={link.href} className="min-w-0 flex-1">
                <Link
                  href={link.href}
                  prefetch
                  onClick={closeMore}
                  onMouseEnter={() => prefetch(link.href)}
                  aria-current={active ? "page" : undefined}
                  data-testid={`admin-tab-${link.labelKey}`}
                  className={`flex min-h-[2.65rem] flex-col items-center justify-center rounded-lg px-0.5 py-0.5 text-[9px] font-semibold leading-tight transition ${
                    active ? "text-[var(--accent)]" : "text-[var(--muted)]"
                  }`}
                >
                  <span
                    className={`mb-0.5 h-0.5 w-5 rounded-full ${active ? "bg-[var(--accent)]" : "bg-transparent"}`}
                    aria-hidden
                  />
                  {link.shortHe}
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              type="button"
              data-testid="admin-tab-more"
              aria-expanded={moreOpen}
              aria-controls="admin-nav-more-full"
              onClick={() => setMoreOpen((v) => !v)}
              className={`flex min-h-[2.65rem] w-full flex-col items-center justify-center rounded-lg px-0.5 py-0.5 text-[9px] font-semibold leading-tight ${
                moreActive || moreOpen ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              <span
                className={`mb-0.5 h-0.5 w-5 rounded-full ${moreActive || moreOpen ? "bg-[var(--accent)]" : "bg-transparent"}`}
                aria-hidden
              />
              עוד
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen ? (
        <div
          id="admin-nav-more-full"
          role="dialog"
          aria-modal
          className="fixed inset-0 z-[90] flex flex-col bg-white md:hidden"
          style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <header className="flex items-center justify-between border-b border-[var(--stroke)] px-3 py-2.5">
            <p className="text-sm font-semibold text-[var(--hero)]">עוד בפורטל</p>
            <button
              type="button"
              className="rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs"
              onClick={closeMore}
            >
              סגירה
            </button>
          </header>
          <ul className="flex-1 overflow-y-auto p-2 space-y-1">
            {MORE_LINKS.map((link) => (
              <li key={link.href}>
                <button
                  type="button"
                  data-testid={`admin-more-${link.labelKey}`}
                  onClick={() => go(link.href)}
                  className={`flex w-full items-center rounded-lg border px-3 py-3 text-start text-sm ${
                    isActive(pathname, link)
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--hero)]"
                      : "border-[var(--stroke)]"
                  }`}
                >
                  {t.adminNav[link.labelKey]}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="flex w-full rounded-lg border border-dashed border-[var(--stroke)] px-3 py-3 text-start text-sm text-[var(--muted)]"
                onClick={() => go("/")}
              >
                חזרה לאפליקציה
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </>
  );
}

/** @deprecated use AdminNavDesktop + AdminNavMobileBar */
export function AdminNav() {
  return (
    <>
      <AdminNavDesktop />
      <AdminNavMobileBar />
    </>
  );
}
