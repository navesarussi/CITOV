import {
  listAdminMatches,
  type AdminMatchFilter,
} from "@/application/admin-matches-browse";
import { mergeEvalFixtureIntoIndex } from "@/application/eval-embedding-index";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { parseAdminDataScope } from "@/infrastructure/admin-data-scope";
import { loadMatchingEmbeddingIndex } from "@/infrastructure/db/card-embeddings";
import { filterStoreByScope } from "@/infrastructure/db/store-scope";
import { readNormalizedStore } from "@/infrastructure/db/normalized-store";
import { readMatchingStore } from "@/infrastructure/store";
import { ok, fail } from "@/infrastructure/http";
import { withApiLogging } from "@/infrastructure/api-route-log";

const ROUTE = "/api/admin/matches";

function parseFilter(raw: string | null): AdminMatchFilter {
  if (raw === "approved" || raw === "rejected" || raw === "below_threshold") return raw;
  return "queued";
}

async function GETHandler(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const scope = parseAdminDataScope(req);
    const raw = scope === "test" ? await readNormalizedStore() : await readMatchingStore();
    const store = filterStoreByScope(raw, scope);
    const index = mergeEvalFixtureIntoIndex(await loadMatchingEmbeddingIndex(store));
    const url = new URL(req.url);
    const filter = parseFilter(url.searchParams.get("filter"));
    const search = url.searchParams.get("q")?.trim() ?? "";
    const jobId = url.searchParams.get("jobId")?.trim() || undefined;
    const candidateId = url.searchParams.get("candidateId")?.trim() || undefined;
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25");
    const sort = url.searchParams.get("sort") === "score_asc" ? "score_asc" : "score_desc";

    const result = listAdminMatches({
      store,
      index,
      filter,
      search,
      jobId,
      candidateId,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 25,
      sort,
    });

    return ok({ ...result, dataScope: scope, queueThreshold: store.adminSettings?.matchQueueThreshold });
  } catch (e) {
    return fail(e, undefined, { route: ROUTE });
  }
}

export const GET = withApiLogging(ROUTE, GETHandler);
