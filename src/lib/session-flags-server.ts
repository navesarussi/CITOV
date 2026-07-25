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
  /** DevLoginDialog on `/` and `/for-employers` — local/dev only. */
  testLoginOnLanding: boolean;
  memoryStore: boolean;
  devUsers: { id: string; name: string; role: Role; email?: string }[];
  /** True when Google or local test/dev session is active. */
  signedIn: boolean;
  isAdmin: boolean;
  email: string | null;
};

export async function getSessionFlags(): Promise<SessionFlagsPayload> {
  const devSession = await getDevSession();
  const session = await auth();
  const email = devSession?.email ?? session?.user?.email ?? null;
  const signedIn = Boolean(devSession || session?.user);
  const isAdmin =
    signedIn &&
    (devSessionIsAdmin(devSession) || isAdminEmail(session?.user?.email));
  const devAuth = isDevAuthEnabled();
  return {
    googleAuth: hasGoogleAuth(),
    allowDemo: allowDemoMode(),
    openAuth: allowOpenAuth(),
    devAuth,
    testLoginOnLanding: devAuth && process.env.NODE_ENV === "development",
    memoryStore: shouldUseMemoryStore(),
    devUsers: devAuth ? listDevUsers() : [],
    signedIn,
    isAdmin,
    email,
  };
}
