import {
  hasGoogleAuth,
  isGoogleAuthEnabled,
  isTestLoginEnabled,
} from "@/infrastructure/auth-flags";
import { isDevAuthEnabled } from "@/infrastructure/dev-auth";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok } from "@/infrastructure/http";

/** Public: `{ ok }`. Admin `?detail=1`: auth flags (no secrets). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const detail = url.searchParams.get("detail") === "1";
  const configured = hasGoogleAuth();
  if (!detail) {
    return ok({ ok: configured });
  }
  const gate = await assertAdmin();
  if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
  return ok({
    ok: configured,
    googleAuth: configured,
    googleEnabledFlag: isGoogleAuthEnabled(),
    authSecretConfigured: Boolean(process.env.AUTH_SECRET?.trim()),
    authGoogleIdConfigured: Boolean(process.env.AUTH_GOOGLE_ID?.trim()),
    authGoogleSecretConfigured: Boolean(process.env.AUTH_GOOGLE_SECRET?.trim()),
    authUrl: process.env.AUTH_URL?.trim() || null,
    devAuth: isDevAuthEnabled(),
    testLoginEnabled: isTestLoginEnabled(),
  });
}
