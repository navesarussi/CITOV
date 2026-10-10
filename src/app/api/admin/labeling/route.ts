import { extendedLiveMetrics } from "@/application/admin-labeling-metrics";
import { getLabelingPair, nextLabelingPairs, scoresForPair } from "@/application/admin-labeling";
import type { RelevanceLabel } from "@/domain/matching-eval/types";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { mergeEvalFixtureIntoIndex } from "@/application/eval-embedding-index";
import { loadMatchingEmbeddingIndex } from "@/infrastructure/db/card-embeddings";
import { upsertMatchLabel } from "@/infrastructure/db/match-labels";
import { readMatchingStore, readStore, writeStore } from "@/infrastructure/store";
import { upsertAdminSettings } from "@/infrastructure/db/normalized-store";
import { ok, fail } from "@/infrastructure/http";

export async function GET(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const store = await readMatchingStore();
    const index = mergeEvalFixtureIntoIndex(await loadMatchingEmbeddingIndex(store));
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId")?.trim();
    const candidateId = url.searchParams.get("candidateId")?.trim();
    const metrics = await extendedLiveMetrics(store, index);
    if (jobId && candidateId) {
      const pair = getLabelingPair(store, jobId, candidateId, index, "review");
      return ok({ pair, metrics });
    }
    const pairs = await nextLabelingPairs(store, index, 1);
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
      action?: "label" | "applyThreshold";
      jobId?: string;
      candidateId?: string;
      label?: RelevanceLabel;
      note?: string;
      threshold?: number;
    };

    if (body.action === "applyThreshold") {
      const t = Number(body.threshold);
      if (!Number.isFinite(t) || t < 0.1 || t > 0.95) {
        return ok({ error: "סף לא תקין" }, { status: 400 });
      }
      const full = await readStore();
      const settings = {
        ...(full.adminSettings ?? { candidatePrompt: "", employerPrompt: "" }),
        matchQueueThreshold: t,
        updatedAt: new Date().toISOString(),
        updatedBy: gate.email ?? "admin",
      };
      await upsertAdminSettings(settings);
      await writeStore({ ...full, adminSettings: settings });
      const store = await readMatchingStore();
      const index = mergeEvalFixtureIntoIndex(await loadMatchingEmbeddingIndex(store));
      const metrics = await extendedLiveMetrics(store, index);
      return ok({ ok: true, appliedThreshold: t, metrics });
    }

    if (!body.jobId || !body.candidateId || !body.label) {
      return ok({ error: "חסרים jobId / candidateId / label" }, { status: 400 });
    }
    const store = await readMatchingStore();
    const index = mergeEvalFixtureIntoIndex(await loadMatchingEmbeddingIndex(store));
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
    const metrics = await extendedLiveMetrics(store, index);
    const next = await nextLabelingPairs(store, index, 1);
    return ok({ ok: true, metrics, pair: next[0] ?? null });
  } catch (e) {
    return fail(e);
  }
}
