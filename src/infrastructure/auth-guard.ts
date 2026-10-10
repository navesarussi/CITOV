import { auth } from "@/auth";
import { isAdminSandboxUserId } from "@/domain/admin-sandbox";
import { getMessages } from "@/i18n";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/types";
import type { StoreData, User } from "@/domain/types";
import { allowOpenAuth } from "@/infrastructure/auth-flags";
import { getDevSession, isDevAuthEnabled } from "@/infrastructure/dev-auth";
import { sessionOwnsUser } from "@/domain/session-ownership";
import { findUserByEmailOrGoogle } from "@/infrastructure/db/normalized-store";
import { findUserById, readActorStore } from "@/infrastructure/db/slice-store";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { resolveOAuthSessionEmail } from "@/infrastructure/session-email";

export function allowDemo(): boolean {
  return process.env.ALLOW_DEMO === "true";
}

export function isDemoUserId(userId: string): boolean {
  return userId === "demo-employee" || userId === "demo-employer";
}

async function authorizeUserId(
  userId: string,
  locale: Locale,
): Promise<{ ok: true; user: User } | { ok: false; status: number; error: string }> {
  const api = getMessages(locale).api;

  if (isAdminSandboxUserId(userId)) {
    const admin = await assertAdmin();
    if (admin.ok) {
      const user =
        (await findUserById(userId)) ??
        ({
          id: userId,
          name: userId.includes("employer") ? "מעסיק בדיקה (מנהל)" : "מועמד בדיקה (מנהל)",
          role: userId.includes("employer") ? "employer" : "employee",
          email: `${userId}@sandbox.citov.local`,
          createdAt: new Date().toISOString(),
        } as User);
      return { ok: true, user };
    }
  }

  if (allowDemo() && isDemoUserId(userId)) {
    const user =
      (await findUserById(userId)) ??
      ({
        id: userId,
        name: userId,
        role: userId.includes("employer") ? "employer" : "employee",
        createdAt: new Date().toISOString(),
      } as User);
    return { ok: true, user };
  }

  if (isDevAuthEnabled()) {
    const dev = await getDevSession();
    if (dev?.kind === "user" && dev.userId === userId) {
      const user = await findUserById(userId);
      if (!user) return { ok: false, status: 404, error: api.userNotFound };
      return { ok: true, user };
    }
  }

  if (allowOpenAuth()) {
    const user = await findUserById(userId);
    if (!user) return { ok: false, status: 404, error: api.userNotFound };
    return { ok: true, user };
  }

  const session = await auth();
  const email = (await resolveOAuthSessionEmail()) ?? undefined;
  const googleId = session?.user?.googleId ?? session?.user?.id;
  if (!email && !googleId) return { ok: false, status: 401, error: api.googleRequired };

  const user = await findUserById(userId);
  if (!user) return { ok: false, status: 404, error: api.userNotFound };
  if (
    sessionOwnsUser({
      sessionEmail: email,
      sessionGoogleId: googleId,
      userEmail: user.email,
      userGoogleId: user.googleId,
    })
  ) {
    return { ok: true, user };
  }

  const canonical = email
    ? await findUserByEmailOrGoogle(email, googleId)
    : null;
  if (
    canonical &&
    canonical.id !== userId &&
    sessionOwnsUser({
      sessionEmail: email,
      sessionGoogleId: googleId,
      userEmail: canonical.email,
      userGoogleId: canonical.googleId,
    })
  ) {
    return { ok: false, status: 409, error: api.sessionUserStale };
  }

  return { ok: false, status: 403, error: api.unauthorized };
}

/** Auth only — no store load. Use with slice readers on list endpoints. */
export async function authorizeActor(
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<{ ok: true; user: User } | { ok: false; status: number; error: string }> {
  return authorizeUserId(userId, locale);
}

/**
 * Auth + actor workspace slice (this user's profile/chat/prompts only).
 * Does NOT load other users — safe under concurrent traffic.
 */
export async function assertActor(
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<
  { ok: true; store: StoreData } | { ok: false; status: number; error: string }
> {
  const authz = await authorizeUserId(userId, locale);
  if (!authz.ok) return authz;
  const store = await readActorStore(userId);
  if (!store.users.some((u) => u.id === userId)) {
    // Race: authorized demo seed before upsert — synthesize minimal user row.
    store.users = [authz.user, ...store.users];
  }
  return { ok: true, store };
}
