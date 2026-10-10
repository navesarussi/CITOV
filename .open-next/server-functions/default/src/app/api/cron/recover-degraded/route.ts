import { runDegradedTurnRecovery } from "@/application/recover-degraded-turns";
import { ok, fail } from "@/infrastructure/http";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET?.trim();
    const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!secret || auth !== secret) {
      return ok({ error: "Unauthorized" }, { status: 401 });
    }
    const summary = await runDegradedTurnRecovery(15);
    return ok({ ok: true, summary });
  } catch (e) {
    return fail(e);
  }
}
