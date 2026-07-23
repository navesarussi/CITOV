"use client";

import Image from "next/image";
import Link from "next/link";

export function WorkspaceHeader(props: {
  name: string;
  subtitle: string;
  tabs: React.ReactNode;
}) {
  return (
    <header className="enter mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
      <div className="flex items-start gap-3">
        <Link href="/" className="mt-1 shrink-0">
          <Image src="/logo.png" alt="CITOV" width={40} height={40} className="object-contain" />
        </Link>
        <div>
          <Link
            href="/"
            className="text-xs font-bold tracking-[0.2em] text-[var(--hero)] uppercase"
          >
            CITOV
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--hero)] sm:text-3xl">
            {props.name}
          </h1>
          <p className="text-sm text-[var(--muted)]">{props.subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 pe-14">{props.tabs}</div>
    </header>
  );
}
