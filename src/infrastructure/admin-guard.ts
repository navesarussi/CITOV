import { isAdminEmail } from "@/infrastructure/admin-config";
import {
  devSessionIsAdmin,
  getDevSession,
} from "@/infrastructure/dev-auth";
import { E2E_ADMIN_COOKIE, isE2eAuthEnabled, verifyE2eAdminCookie } from "@/infrastructure/e2e-auth";
import { resolveOAuthSessionEmail } from "@/infrastructure/session-email";
import { cookies } from "next/headers";

export async function assertAdmin(): Promise<
  { ok: true; email: string } | { ok: false; status: number; error: string }
> {
  const dev = await getDevSession();
  if (dev && devSessionIsAdmin(dev)) {
    return { ok: true, email: dev.email };
  }

  if (isE2eAuthEnabled()) {
    const jar = await cookies();
    const e2eAdmin = jar.get(E2E_ADMIN_COOKIE)?.value;
    if (verifyE2eAdminCookie(e2eAdmin)) {
      return { ok: true, email: "e2e-admin@citov.test" };
    }
  }

  const email = await resolveOAuthSessionEmail();
  if (!email) {
    return { ok: false, status: 401, error: "נדרשת התחברות עם Google" };
  }
  if (!isAdminEmail(email)) {
    return { ok: false, status: 403, error: "אין הרשאת מנהל" };
  }
  return { ok: true, email };
}
