import { listAdminEmployers } from "@/application/admin-browse";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

export async function GET() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const store = await readStore();
    return ok({ employers: listAdminEmployers(store) });
  } catch (e) {
    return fail(e);
  }
}
