import { buildAdminAiUsageDashboard } from "@/application/admin-ai-usage";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { listAiUsageRows } from "@/infrastructure/db/ai-usage";
import { ok, fail } from "@/infrastructure/http";

export async function GET() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 120);
    const rows = await listAiUsageRows(since.toISOString(), 8000);
    const dashboard = buildAdminAiUsageDashboard(rows);
    return ok({ dashboard });
  } catch (e) {
    return fail(e);
  }
}
