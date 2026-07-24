import { auth } from "@/auth";
import { listDevUsers } from "@/application/dev-login";
import type { Role } from "@/domain/types";
import { isAdminEmail } from "@/infrastructure/admin-config";
import {
  allowDemoMode,
  allowOpenAuth,
  hasGoogleAuth,
} from "@/infrastructure/auth-flags";
import {
  devSessionIsAdmin,
  getDevSession,
  isDevAuthEnabled,
} from "@/infrastructure/dev-auth";
import { shouldUseMemoryStore } from "@/infrastructure/db/memory-store";

export type SessionFlagsPayload = {
  googleAuth: boolean;
  allowDemo: boolean;
  openAuth: boolean;
  devAuth: boolean;
  memoryStore: boolean;
  devUsers: { id: string; name: string; role: Role; email?: string }[];
  isAdmin: boolean;
  email: string | null;
};

export async function getSessionFlags(): Promise<SessionFlagsPayload> {
  const devSession = await getDevSession();
  const session = await auth();
  const email = devSession?.email ?? session?.user?.email ?? null;
  const isAdmin = devSessionIsAdmin(devSession) || isAdminEmail(session?.user?.email);
  const devAuth = isDevAuthEnabled();
  return {
    googleAuth: hasGoogleAuth(),
    allowDemo: allowDemoMode(),
    openAuth: allowOpenAuth(),
    devAuth,
    memoryStore: shouldUseMemoryStore(),
    devUsers: devAuth ? listDevUsers() : [],
    isAdmin,
    email,
  };
}
