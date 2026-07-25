import { getAdminCandidateDetail } from "@/application/admin-browse";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const { id } = await ctx.params;
    const store = await readStore();
    const detail = getAdminCandidateDetail(store, id);
    if (!detail) return ok({ error: "מועמד לא נמצא" }, { status: 404 });
    return ok({ candidate: detail });
  } catch (e) {
    return fail(e);
  }
}
