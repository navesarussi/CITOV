"use client";

import Image from "next/image";
import Link from "next/link";
import { AdminBudgetBanner } from "@/components/admin/AdminBudgetBanner";
import { AdminNav } from "@/components/admin/AdminNav";
import { SettingsMenu } from "@/components/SettingsMenu";

export function AdminShell(props: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="workspace-shell atmosphere">
      <header className="glass-bar enter">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="settings-menu-anchor shrink-0">
                <SettingsMenu variant="header" />
              </div>
              <Link href="/" className="shrink-0 rounded-xl bg-white/60 p-1.5 shadow-sm">
                <Image src="/logo.png" alt="CITOV" width={36} height={36} className="object-contain" />
              </Link>
              <div>
                <p className="eyebrow">CITOV Admin</p>
                <h1 className="text-lg font-bold text-[var(--hero)]">{props.title}</h1>
                <p className="text-xs text-[var(--muted)] sm:text-sm">{props.subtitle}</p>
              </div>
            </div>
            {props.actions ? (
              <div className="flex flex-wrap items-center gap-2">{props.actions}</div>
            ) : null}
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="workspace-main flex max-w-5xl min-h-0 flex-1 flex-col">
        <AdminBudgetBanner />
        {props.children}
      </main>
    </div>
  );
}
