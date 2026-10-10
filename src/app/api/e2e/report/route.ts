import { recordAppEvent } from "@/infrastructure/db/app-events";
import { ok } from "@/infrastructure/http";

function authorized(req: Request): boolean {
  const secret = process.env.E2E_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-e2e-secret") === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return ok({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    await recordAppEvent({
      kind: "e2e_run",
      severity: body.ok === false ? "critical" : "info",
      message: String(body.summary ?? "E2E run"),
      meta: body,
    });
    return ok({ ok: true });
  } catch (e) {
    return ok({ error: String(e) }, { status: 500 });
  }
}
