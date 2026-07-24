import {
  hasGoogleAuth,
  isGoogleAuthEnabled,
  isTestLoginEnabled,
} from "@/infrastructure/auth-flags";
import { isDevAuthEnabled } from "@/infrastructure/dev-auth";
import { ok } from "@/infrastructure/http";

/** Public auth wiring check — never returns secrets. */
export async function GET() {
  const authSecretConfigured = Boolean(process.env.AUTH_SECRET?.trim());
  const authGoogleIdConfigured = Boolean(process.env.AUTH_GOOGLE_ID?.trim());
  const authGoogleSecretConfigured = Boolean(process.env.AUTH_GOOGLE_SECRET?.trim());

  return ok({
    googleAuth: hasGoogleAuth(),
    googleEnabledFlag: isGoogleAuthEnabled(),
    authSecretConfigured,
    authGoogleIdConfigured,
    authGoogleSecretConfigured,
    authUrl: process.env.AUTH_URL?.trim() || null,
    devAuth: isDevAuthEnabled(),
    testLoginEnabled: isTestLoginEnabled(),
    hint: hasGoogleAuth()
      ? "Google OAuth is configured. Sign-in uses /api/auth/signin/google with CSRF."
      : "Missing AUTH_SECRET and/or Google OAuth credentials on the server.",
  });
}
