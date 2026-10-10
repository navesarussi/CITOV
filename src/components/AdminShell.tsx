"use client";

import Image from "next/image";
import Link from "next/link";
import { AdminBudgetBanner } from "@/components/admin/AdminBudgetBanner";
import { AdminNavDesktop, AdminNavMobileBar } from "@/components/admin/AdminNav";
import { SettingsMenu } from "@/components/SettingsMenu";
import "@/styles/admin-portal.css";

export function AdminShell(props: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  wide?: boolean;
  /** Extra bottom inset on mobile (e.g. labeling thumb bar above tabs) */
  mobileBottomInset?: "labeling";
  children: React.ReactNode;
}) {
  const width = props.wide ? "max-w-6xl" : "max-w-5xl";
  const mainInset =
    props.mobileBottomInset === "labeling" ? "admin-main-with-label-bar" : "admin-main-with-tab-bar";
  return (
    <div className="admin-portal workspace-shell atmosphere min-h-dvh">
      <header className="glass-bar enter sticky top-0 z-40 border-b border-[var(--stroke)]/80">
        <div className={`mx-auto flex ${width} flex-col gap-1.5 px-2.5 py-2 sm:gap-3 sm:px-4 sm:py-3`}>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="settings-menu-anchor hidden shrink-0 sm:block">
                <SettingsMenu variant="header" />
              </div>
              <Link href="/" className="shrink-0 rounded-lg bg-white/60 p-0.5 shadow-sm sm:rounded-xl sm:p-1">
                <Image
                  src="/logo.png"
                  alt="CITOV"
                  width={28}
                  height={28}
                  className="object-contain sm:h-9 sm:w-9"
                />
              </Link>
              <div className="min-w-0">
                <p className="eyebrow hidden text-[10px] sm:block">CITOV Admin</p>
                <h1 className="truncate text-sm font-bold text-[var(--hero)] sm:text-lg">{props.title}</h1>
                <p className="hidden text-xs text-[var(--muted)] sm:block sm:text-sm">{props.subtitle}</p>
              </div>
            </div>
            {props.actions ? (
              <div className="flex max-w-[45%] shrink-0 flex-wrap items-center justify-end gap-1 sm:max-w-none sm:gap-2">
                {props.actions}
              </div>
            ) : null}
          </div>
          <p className="text-[10px] leading-snug text-[var(--muted)] sm:hidden">{props.subtitle}</p>
          <AdminNavDesktop />
        </div>
      </header>
      <main
        className={`admin-main workspace-main mx-auto flex ${width} min-h-0 w-full flex-1 flex-col ${mainInset}`}
      >
        <AdminBudgetBanner />
        <div className="min-w-0 flex-1 py-2 sm:py-4">{props.children}</div>
      </main>
      <AdminNavMobileBar />
    </div>
  );
}
