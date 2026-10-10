import { computeAiBudgetStatus } from "@/application/ai-budget";
import type { GroupedIssue } from "@/domain/app-event";
import { listAiUsageSince } from "@/infrastructure/db/ai-usage-query";
import {
  latestE2eRun,
  listGroupedIssues,
  routeLatencyStats,
} from "@/infrastructure/db/app-events";

export type MonitoringDashboard = {
  issues: GroupedIssue[];
  latency: { route: string; p50: number; p95: number; count: number }[];
  aiBudget: ReturnType<typeof computeAiBudgetStatus>;
  e2e: Record<string, unknown> | null;
};

export async function buildMonitoringDashboard(): Promise<MonitoringDashboard> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const usage = await listAiUsageSince(monthStart.toISOString());
  const [issues, latency, e2e] = await Promise.all([
    listGroupedIssues(50),
    routeLatencyStats(24),
    latestE2eRun(),
  ]);
  return {
    issues,
    latency,
    aiBudget: computeAiBudgetStatus(usage),
    e2e,
  };
}
