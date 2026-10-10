import { cookies } from "next/headers";

export function isE2eAuthEnabled(): boolean {
  return process.env.E2E_AUTH_ENABLED === "true" && Boolean(process.env.E2E_SECRET?.trim());
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
