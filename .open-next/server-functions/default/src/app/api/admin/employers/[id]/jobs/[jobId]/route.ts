import { getAdminJobDetail } from "@/application/admin-browse";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; jobId: string }> },
) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const { id, jobId } = await ctx.params;
    const store = await readStore();
    const detail = getAdminJobDetail(store, id, jobId);
    if (!detail) return ok({ error: "משרה לא נמצאה" }, { status: 404 });
    return ok({ job: detail });
  } catch (e) {
    return fail(e);
  }
}
