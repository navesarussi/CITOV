"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import type { Role } from "@/domain/types";
import { readStoredUser, syncStoredUserWithGoogleSession } from "@/lib/client-session";

/**
 * Keeps `shidukh_user` aligned with the active Google session (fixes stale ids after sign-out/deploy).
 */
export function useGoogleWorkspaceSync(role: Role): {
  user: { id: string; name: string; role: Role } | null;
  ready: boolean;
  syncError: string | null;
} {
  const { status } = useSession();
  const [user, setUser] = useState<{ id: string; name: string; role: Role } | null>(null);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncing = useRef(false);

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated") {
      const stored = readStoredUser();
      setUser(stored?.role === role ? stored : null);
      setSyncError(null);
      setReady(true);
      return;
    }

    if (syncing.current) return;
    syncing.current = true;
    setReady(false);
    void syncStoredUserWithGoogleSession(role)
      .then((u) => {
        setUser(u?.role === role ? u : null);
        setSyncError(null);
      })
      .catch((e) => {
        const stored = readStoredUser();
        setUser(stored?.role === role ? stored : null);
        setSyncError(e instanceof Error ? e.message : "Session sync failed");
      })
      .finally(() => {
        syncing.current = false;
        setReady(true);
      });
  }, [role, status]);

  return { user, ready, syncError };
}
