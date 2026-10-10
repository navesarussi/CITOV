import { buildDatasetFromDbLabels } from "@/application/admin-labeling";
import { extendedLiveMetrics, previewThresholdApply } from "@/application/admin-labeling-metrics";
import { getLabelingPair, nextLabelingPairs, scoresForPair } from "@/application/admin-labeling";
import type { RelevanceLabel } from "@/domain/matching-eval/types";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { mergeEvalFixtureIntoIndex } from "@/application/eval-embedding-index";
import { loadMatchingEmbeddingIndex } from "@/infrastructure/db/card-embeddings";
import { upsertMatchLabel } from "@/infrastructure/db/match-labels";
import { nextTestRunLabelingPairs } from "@/application/test-sandbox/labeling-queue";
import { parseAdminDataScope } from "@/infrastructure/admin-data-scope";
import { filterStoreByScope } from "@/infrastructure/db/store-scope";
import { readNormalizedStore } from "@/infrastructure/db/normalized-store";
import { readMatchingStore, readStore, writeStore } from "@/infrastructure/store";
import { upsertAdminSettings } from "@/infrastructure/db/normalized-store";
import { ok, fail } from "@/infrastructure/http";

import { withApiLogging } from "@/infrastructure/api-route-log";

const ROUTE = "/api/admin/labeling";

async function GETHandler(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const scope = parseAdminDataScope(req);
    const raw = scope === "test" ? await readNormalizedStore() : await readMatchingStore();
    const store = filterStoreByScope(raw, scope);
    const index = mergeEvalFixtureIntoIndex(await loadMatchingEmbeddingIndex(store));
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId")?.trim();
    const candidateId = url.searchParams.get("candidateId")?.trim();
    const metrics = await extendedLiveMetrics(store, index);
    if (jobId && candidateId) {
      const pair = getLabelingPair(store, jobId, candidateId, index, scope === "test" ? "test-run" : "review");
      return ok({ pair, metrics, dataScope: scope });
    }
    const pairs =
      scope === "test"
        ? await nextTestRunLabelingPairs(store, index, 1)
        : await nextLabelingPairs(store, index, 1);
    return ok({ pair: pairs[0] ?? null, metrics, dataScope: scope });
  } catch (e) {
    return fail(e, undefined, { route: ROUTE });
  }
}

async function POSTHandler(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const body = (await req.json()) as {
      action?: "label" | "applyThreshold" | "previewThreshold";
      jobId?: string;
      candidateId?: string;
      label?: RelevanceLabel;
      note?: string;
      threshold?: number;
    };

    if (body.action === "previewThreshold") {
      const t = Number(body.threshold);
      if (!Number.isFinite(t) || t < 0.1 || t > 0.95) {
        return ok({ error: "סף לא תקין" }, { status: 400 });
      }
      const store = await readMatchingStore();
      const index = mergeEvalFixtureIntoIndex(await loadMatchingEmbeddingIndex(store));
      const dataset = await buildDatasetFromDbLabels(store);
      if (!dataset?.labels.length) {
        return ok({ error: "אין מספיק תיוגים לתצוגה מקדימה" }, { status: 400 });
      }
      return ok({ preview: previewThresholdApply(store, dataset, index, t) });
    }

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
    const scope = parseAdminDataScope(req);
    const raw = scope === "test" ? await readNormalizedStore() : await readMatchingStore();
    const store = filterStoreByScope(raw, scope);
    const index = mergeEvalFixtureIntoIndex(await loadMatchingEmbeddingIndex(store));
    const scores = scoresForPair(store, body.jobId, body.candidateId, index);
    await upsertMatchLabel({
      jobId: body.jobId,
      candidateId: body.candidateId,
      label: body.label,
      note: body.note,
      source: scope === "test" ? "test-run" : "admin",
      labelerUserId: gate.email ?? "admin",
      ruleScore: scores.ruleScore,
      hybridScore: scores.hybridScore,
      matcherVersion: scores.matcherVersion,
    });
    const metrics = await extendedLiveMetrics(store, index);
    const next =
      scope === "test"
        ? await nextTestRunLabelingPairs(store, index, 1)
        : await nextLabelingPairs(store, index, 1);
    return ok({ ok: true, metrics, pair: next[0] ?? null, dataScope: scope });
  } catch (e) {
    return fail(e, undefined, { route: ROUTE, userEmail: undefined });
  }
}

export const GET = withApiLogging(ROUTE, GETHandler);
export const POST = withApiLogging(ROUTE, POSTHandler);
