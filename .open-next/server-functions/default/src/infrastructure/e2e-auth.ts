import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const E2E_ADMIN_COOKIE = "citov_e2e_admin";

export function isE2eAuthEnabled(): boolean {
  return process.env.E2E_AUTH_ENABLED === "true" && Boolean(process.env.E2E_SECRET?.trim());
}

function e2eAdminToken(): string {
  const secret = process.env.E2E_SECRET!.trim();
  return createHmac("sha256", secret).update("citov-e2e-admin-v1").digest("base64url");
}

export function verifyE2eAdminCookie(value: string | undefined | null): boolean {
  if (!isE2eAuthEnabled() || !value) return false;
  const expected = e2eAdminToken();
  try {
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function e2eAdminSetCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${E2E_ADMIN_COOKIE}=${e2eAdminToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200${secure}`;
}

export function e2eSessionCookie(userId: string): string {
  const maxAge = 60 * 60 * 2;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `citov_e2e_user=${encodeURIComponent(userId)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

export async function readE2eSessionUserId(): Promise<string | null> {
  if (!isE2eAuthEnabled()) return null;
  const jar = await cookies();
  const raw = jar.get("citov_e2e_user")?.value;
  if (!raw) return null;
  const id = decodeURIComponent(raw);
  return id.startsWith("e2e-") ? id : null;
}
