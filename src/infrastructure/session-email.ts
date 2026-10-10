import { auth } from "@/auth";
import { normalizeSessionEmail } from "@/domain/session-email";

/** Resolve the signed-in email from NextAuth session (JWT-backed). */
export async function resolveOAuthSessionEmail(): Promise<string | null> {
  const session = await auth();
  return normalizeSessionEmail(session?.user?.email ?? null);
}
