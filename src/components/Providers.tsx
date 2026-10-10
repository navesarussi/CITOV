"use client";

import { SessionProvider } from "next-auth/react";
import { AppVersionFooter } from "@/components/AppVersion";
import { ClientErrorReporter } from "@/components/ClientErrorReporter";
import { LocaleProvider } from "@/components/LocaleProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <SessionProvider>
        <ClientErrorReporter />
        {children}
        <AppVersionFooter />
      </SessionProvider>
    </LocaleProvider>
  );
}
