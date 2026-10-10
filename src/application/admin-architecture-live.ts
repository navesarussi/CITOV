import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_COSINE_FLOOR } from "@/domain/matching-calibration";
import { DEFAULT_HYBRID_WEIGHTS } from "@/domain/semantic-matching";
import { readHybridWeights, readQueueThreshold } from "@/application/matching-config";
import { buildMonitoringDashboard } from "@/application/monitoring-dashboard";
import { latestSandboxRunReport } from "@/infrastructure/db/app-events";
import { listAiUsageRows } from "@/infrastructure/db/ai-usage";
import { readStore } from "@/infrastructure/store";

export type ArchitectureLiveStats = {
  ai: {
    calls7d: number;
    costUsd7d: number;
    avgLatencyMs: number | null;
    errors7d: number;
  };
  matching: {
    semanticWeight: number;
    ruleWeight: number;
    cosineFloor: number;
    queueThreshold: number;
  };
  eval: {
    hybridNdcgAt5: number | null;
    hybridRecallAt5: number | null;
    hybridPrecisionAt5: number | null;
    datasetVersion: string | null;
  };
  sandboxReportLink: string;
  hasSandboxReport: boolean;
};

function loadEvalSnapshot(): ArchitectureLiveStats["eval"] {
  try {
    const raw = readFileSync(join(process.cwd(), "eval/matching/results/latest.json"), "utf8");
    const j = JSON.parse(raw) as {
      datasetVersion?: string;
      train?: { matcherId: string; macroNdcgAtK: number; macroRecallAtK: number; macroPrecisionAtK: number }[];
    };
    const hybrid = j.train?.find((m) => m.matcherId === "hybrid-calibrated-v1");
    return {
      datasetVersion: j.datasetVersion ?? null,
      hybridNdcgAt5: hybrid?.macroNdcgAtK ?? null,
      hybridRecallAt5: hybrid?.macroRecallAtK ?? null,
      hybridPrecisionAt5: hybrid?.macroPrecisionAtK ?? null,
    };
  } catch {
    return {
      hybridNdcgAt5: null,
      hybridRecallAt5: null,
      hybridPrecisionAt5: null,
      datasetVersion: null,
    };
  }
}

export async function buildArchitectureLiveStats(): Promise<ArchitectureLiveStats> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);
  const usage = await listAiUsageRows(since.toISOString(), 20_000);
  const latencies = usage.map((r) => r.latencyMs).filter((n): n is number => n != null && n > 0);
  const avgLatencyMs = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;
  const store = await readStore();
  const weights = readHybridWeights();
  const threshold = readQueueThreshold(store.adminSettings);
  const monitoring = await buildMonitoringDashboard();
  const aiErrors = monitoring.issues.filter((i) => i.issueStatus === "open").length;
  const sandbox = await latestSandboxRunReport();

  return {
    ai: {
      calls7d: usage.length,
      costUsd7d: usage.reduce((s, r) => s + r.estimatedCostUsd, 0),
      avgLatencyMs,
      errors7d: aiErrors,
    },
    matching: {
      semanticWeight: weights.semantic ?? DEFAULT_HYBRID_WEIGHTS.semantic,
      ruleWeight: weights.rule ?? DEFAULT_HYBRID_WEIGHTS.rule,
      cosineFloor: DEFAULT_COSINE_FLOOR,
      queueThreshold: threshold,
    },
    eval: loadEvalSnapshot(),
    sandboxReportLink: "/admin/sandbox-report",
    hasSandboxReport: Boolean(sandbox),
  };
}
