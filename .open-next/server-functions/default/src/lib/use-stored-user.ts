"use client";

import { useState } from "react";
import type { Role } from "@/domain/types";
import { readStoredUser } from "@/lib/client-session";

function pickStoredUser(role: Role) {
  const stored = readStoredUser();
  return stored?.role === role ? stored : null;
}

export function useStoredUser(role: Role) {
  const [user, setUser] = useState(() => pickStoredUser(role));
  const [prevRole, setPrevRole] = useState(role);
  if (role !== prevRole) {
    setPrevRole(role);
    setUser(pickStoredUser(role));
  }
  const ready = typeof window !== "undefined";

  return { user, ready };
}
