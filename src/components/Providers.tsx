"use client";

import { SessionProvider } from "next-auth/react";
import { AppVersionFooter } from "@/components/AppVersion";
import { LocaleProvider } from "@/components/LocaleProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <SessionProvider>
        {children}
        <AppVersionFooter />
      </SessionProvider>
    </LocaleProvider>
  );
}
