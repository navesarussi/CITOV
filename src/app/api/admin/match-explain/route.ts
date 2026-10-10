import { explainStoredOrLiveMatch } from "@/application/match-explain-api";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { loadMatchingEmbeddingIndex } from "@/infrastructure/db/card-embeddings";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

export async function GET(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const url = new URL(req.url);
    const matchId = url.searchParams.get("matchId");
    if (!matchId) return ok({ error: "חסר matchId" }, { status: 400 });

    const store = await readStore();
    const match = store.matches.find((m) => m.id === matchId);
    if (!match) return ok({ error: "התאמה לא נמצאה" }, { status: 404 });

    const index = await loadMatchingEmbeddingIndex(store);
    const explained = explainStoredOrLiveMatch({ store, match, index });
    if (!explained) return ok({ error: "לא ניתן לטעון כרטיסים" }, { status: 404 });

    return ok({
      match,
      breakdown: explained.breakdown,
      waterfall: explained.waterfall,
      legacy: explained.legacy,
      candidateCard: explained.candidate,
      jobCard: explained.job,
    });
  } catch (e) {
    return fail(e);
  }
}
