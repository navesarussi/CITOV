import {
  liveLabelingMetrics,
  nextLabelingPairs,
  scoresForPair,
} from "@/application/admin-labeling";
import type { RelevanceLabel } from "@/domain/matching-eval/types";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { loadMatchingEmbeddingIndex } from "@/infrastructure/db/card-embeddings";
import { upsertMatchLabel } from "@/infrastructure/db/match-labels";
import { readMatchingStore } from "@/infrastructure/store";
import { ok, fail } from "@/infrastructure/http";

export async function GET() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const store = await readMatchingStore();
    const index = await loadMatchingEmbeddingIndex(store);
    const [pairs, metrics] = await Promise.all([
      nextLabelingPairs(store, index, 1),
      liveLabelingMetrics(store, index),
    ]);
    return ok({ pair: pairs[0] ?? null, metrics });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const body = (await req.json()) as {
      jobId?: string;
      candidateId?: string;
      label?: RelevanceLabel;
      note?: string;
    };
    if (!body.jobId || !body.candidateId || !body.label) {
      return ok({ error: "חסרים jobId / candidateId / label" }, { status: 400 });
    }
    const store = await readMatchingStore();
    const index = await loadMatchingEmbeddingIndex(store);
    const scores = scoresForPair(store, body.jobId, body.candidateId, index);
    await upsertMatchLabel({
      jobId: body.jobId,
      candidateId: body.candidateId,
      label: body.label,
      note: body.note,
      source: "admin",
      labelerUserId: gate.email ?? "admin",
      ruleScore: scores.ruleScore,
      hybridScore: scores.hybridScore,
      matcherVersion: scores.matcherVersion,
    });
    const metrics = await liveLabelingMetrics(store, index);
    const next = await nextLabelingPairs(store, index, 1);
    return ok({ ok: true, metrics, pair: next[0] ?? null });
  } catch (e) {
    return fail(e);
  }
}
