import { runSandboxFullEval } from "@/application/test-sandbox/full-eval";
import { buildSandboxRunReport, type SandboxRunReport } from "@/application/test-sandbox/run-report";
import { runSandboxMatching } from "@/application/test-sandbox/run-matching";
import {
  assertSandboxIsolation,
  buildSandboxStore,
} from "../../../eval/test-sandbox/generate-dataset";
import { deleteTestDataset, persistTestSandboxStore } from "@/infrastructure/db/test-sandbox-db";
import { loadMatchingEmbeddingIndex } from "@/infrastructure/db/card-embeddings";
import { listAiUsageRows } from "@/infrastructure/db/ai-usage";
import { readNormalizedStore } from "@/infrastructure/db/normalized-store";
import { recordAppEvent } from "@/infrastructure/db/app-events";

function aiSnapshot(sinceIso: string) {
  return listAiUsageRows(sinceIso, 50_000).then((rows) => ({
    calls: rows.length,
    costUsd: rows.reduce((s, r) => s + r.estimatedCostUsd, 0),
  }));
}

function countIndexSegments(
  index: Awaited<ReturnType<typeof loadMatchingEmbeddingIndex>>,
): number {
  let n = 0;
  for (const v of index.candidate.values()) {
    n += Object.keys(v).length;
  }
  for (const v of index.job.values()) {
    n += Object.keys(v).length;
  }
  return n;
}

export async function runSandboxSeedAndReport(): Promise<SandboxRunReport> {
  const runStarted = new Date().toISOString();
  const usageBefore = await aiSnapshot(runStarted);

  await deleteTestDataset();
  let store = buildSandboxStore();
  assertSandboxIsolation(store);
  const full = await readNormalizedStore();
  store = { ...store, adminSettings: full.adminSettings };

  const index = await loadMatchingEmbeddingIndex(store);
  const segmentVectorsLoaded = countIndexSegments(index);

  const { store: matched, stats: rebuild } = runSandboxMatching(store, index);
  const fullEval = runSandboxFullEval(matched, index);
  await persistTestSandboxStore(matched);

  const usageAfter = await aiSnapshot(runStarted);
  const report = buildSandboxRunReport({
    rebuild,
    fullEval,
    segmentVectorsLoaded,
    aiUsageBefore: usageBefore,
    aiUsageAfter: usageAfter,
  });

  await recordAppEvent({
    kind: "sandbox_run_report",
    severity: "info",
    message: `Sandbox run: ${fullEval.queuedCount} queued / ${fullEval.pairCount} pairs`,
    route: "/admin/sandbox-report",
    meta: report as unknown as Record<string, unknown>,
    durationMs: rebuild.durationMs,
  });

  return report;
}
