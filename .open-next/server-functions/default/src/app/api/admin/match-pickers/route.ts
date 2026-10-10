import { listAdminMatchPickers } from "@/application/admin-matches-browse";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { parseAdminDataScope } from "@/infrastructure/admin-data-scope";
import { filterStoreByScope } from "@/infrastructure/db/store-scope";
import { readNormalizedStore } from "@/infrastructure/db/normalized-store";
import { readMatchingStore } from "@/infrastructure/store";
import { ok, fail } from "@/infrastructure/http";

export async function GET(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const scope = parseAdminDataScope(req);
    const raw = scope === "test" ? await readNormalizedStore() : await readMatchingStore();
    const store = filterStoreByScope(raw, scope);
    const pickers = listAdminMatchPickers(store);
    return ok({ ...pickers, dataScope: scope });
  } catch (e) {
    return fail(e);
  }
}
