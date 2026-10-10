import { buildMonitoringDashboard } from "@/application/monitoring-dashboard";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { setIssueStatus } from "@/infrastructure/db/app-events";
import { withApiLogging } from "@/infrastructure/api-route-log";
import { ok, fail } from "@/infrastructure/http";

const ROUTE = "/api/admin/monitoring";

async function GETHandler() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const dashboard = await buildMonitoringDashboard();
    return ok({ dashboard });
  } catch (e) {
    return fail(e, undefined, { route: ROUTE, userEmail: undefined });
  }
}

async function POSTHandler(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const body = (await req.json()) as { action?: string; fingerprint?: string; status?: "open" | "resolved" };
    if (body.action === "setIssueStatus" && body.fingerprint && body.status) {
      await setIssueStatus(body.fingerprint, body.status);
      const dashboard = await buildMonitoringDashboard();
      return ok({ ok: true, dashboard });
    }
    return ok({ error: "פעולה לא נתמכת" }, { status: 400 });
  } catch (e) {
    return fail(e, undefined, { route: ROUTE });
  }
}

export const GET = withApiLogging(ROUTE, GETHandler);
export const POST = withApiLogging(ROUTE, POSTHandler);
