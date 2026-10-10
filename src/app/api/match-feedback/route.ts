import { upsertMatchLabel } from "@/infrastructure/db/match-labels";
import { ok, fail } from "@/infrastructure/http";
import { assertActor } from "@/infrastructure/auth-guard";
import { loadMatchingEmbeddingIndex } from "@/infrastructure/db/card-embeddings";
import { scoresForPair } from "@/application/admin-labeling";
import { readMatchingStore } from "@/infrastructure/store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      matchId?: string;
      action?: "not_relevant";
      note?: string;
    };
    if (!body.userId || !body.matchId || body.action !== "not_relevant") {
      return ok({ error: "חסרים פרטים" }, { status: 400 });
    }
    const gate = await assertActor(body.userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const store = await readMatchingStore();
    const match = store.matches.find(
      (m) => m.id === body.matchId && m.candidateId === body.userId,
    );
    if (!match) return ok({ error: "התאמה לא נמצאה" }, { status: 404 });

    const index = await loadMatchingEmbeddingIndex(store);
    const scores = scoresForPair(store, match.jobId, match.candidateId, index);
    await upsertMatchLabel({
      jobId: match.jobId,
      candidateId: match.candidateId,
      label: "bad",
      note: body.note?.trim() || "לא רלוונטי (מועמד/ת)",
      source: "crowd",
      labelerUserId: body.userId,
      labelerRole: "candidate",
      ruleScore: scores.ruleScore,
      hybridScore: scores.hybridScore,
      matcherVersion: scores.matcherVersion,
    });

    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
