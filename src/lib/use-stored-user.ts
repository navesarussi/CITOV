"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/domain/types";
import { readStoredUser } from "@/lib/client-session";

export function useStoredUser(role: Role) {
  const [user, setUser] = useState<{ id: string; name: string; role: Role } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredUser();
    setUser(stored?.role === role ? stored : null);
    setReady(true);
  }, [role]);

  return { user, ready };
}
