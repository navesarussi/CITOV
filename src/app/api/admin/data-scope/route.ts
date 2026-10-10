import { ADMIN_DATA_SCOPE_COOKIE } from "@/infrastructure/admin-data-scope";
import type { AdminDataScope } from "@/domain/test-sandbox";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok } from "@/infrastructure/http";

export async function POST(req: Request) {
  const gate = await assertAdmin();
  if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
  const body = (await req.json()) as { scope?: AdminDataScope };
  const scope: AdminDataScope = body.scope === "test" ? "test" : "real";
  const res = ok({ ok: true, scope });
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_DATA_SCOPE_COOKIE}=${scope}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
  );
  return res;
}

export async function GET(req: Request) {
  const gate = await assertAdmin();
  if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
  const { parseAdminDataScope } = await import("@/infrastructure/admin-data-scope");
  return ok({ scope: parseAdminDataScope(req) });
}
