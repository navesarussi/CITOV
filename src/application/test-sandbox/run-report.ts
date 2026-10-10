import type { MatchRebuildStats } from "@/application/rebuild-matches";
import { TEST_SANDBOX_DATASET_ID } from "@/domain/test-sandbox";
import type { SandboxFullEvalResult } from "./full-eval";

export type SandboxRunReport = {
  datasetId: string;
  generatedAt: string;
  rebuild: MatchRebuildStats;
  fullEval: SandboxFullEvalResult;
  embedding: {
    /** Estimated embedding API calls (segment rows touched). */
    segmentVectorsLoaded: number;
    aiUsageCallsDuringRun: number;
    aiUsageCostUsdDuringRun: number;
  };
};

export function buildSandboxRunReport(params: {
  rebuild: MatchRebuildStats;
  fullEval: SandboxFullEvalResult;
  segmentVectorsLoaded: number;
  aiUsageBefore: { calls: number; costUsd: number };
  aiUsageAfter: { calls: number; costUsd: number };
}): SandboxRunReport {
  return {
    datasetId: TEST_SANDBOX_DATASET_ID,
    generatedAt: new Date().toISOString(),
    rebuild: params.rebuild,
    fullEval: params.fullEval,
    embedding: {
      segmentVectorsLoaded: params.segmentVectorsLoaded,
      aiUsageCallsDuringRun: Math.max(0, params.aiUsageAfter.calls - params.aiUsageBefore.calls),
      aiUsageCostUsdDuringRun: Math.max(
        0,
        params.aiUsageAfter.costUsd - params.aiUsageBefore.costUsd,
      ),
    },
  };
}
