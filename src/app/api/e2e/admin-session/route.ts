import { e2eAdminSetCookieHeader, isE2eAuthEnabled } from "@/infrastructure/e2e-auth";
import { ok } from "@/infrastructure/http";

function authorized(req: Request): boolean {
  const secret = process.env.E2E_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-e2e-secret") === secret;
}

export async function POST(req: Request) {
  if (!isE2eAuthEnabled()) {
    return ok({ error: "E2E auth disabled" }, { status: 403 });
  }
  if (!authorized(req)) {
    return ok({ error: "unauthorized" }, { status: 401 });
  }
  const res = ok({ ok: true });
  res.headers.append("Set-Cookie", e2eAdminSetCookieHeader());
  return res;
}
