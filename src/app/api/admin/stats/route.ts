import { getAdminDashboard } from "@/application/admin";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { listAiUsageRows } from "@/infrastructure/db/ai-usage";
import { listMatchLabels } from "@/infrastructure/db/match-labels";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

function adminCrowdAgreement(rows: Awaited<ReturnType<typeof listMatchLabels>>): number | null {
  const adminByPair = new Map<string, string>();
  for (const r of rows.filter((x) => x.source === "admin")) {
    adminByPair.set(`${r.jobId}:${r.candidateId}`, r.label);
  }
  let compared = 0;
  let agree = 0;
  for (const r of rows.filter((x) => x.source === "crowd")) {
    const key = `${r.jobId}:${r.candidateId}`;
    const adminLabel = adminByPair.get(key);
    if (!adminLabel) continue;
    compared += 1;
    if (adminLabel === r.label) agree += 1;
  }
  if (!compared) return null;
  return agree / compared;
}

export async function GET() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const store = await readStore();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 120);
    const usageRows = await listAiUsageRows(since.toISOString(), 8000);
    const dash = getAdminDashboard({
      ...store,
      aiUsage: usageRows.map((r) => ({
        id: r.id,
        type: r.type,
        promptTokens: r.promptTokens,
        completionTokens: r.completionTokens,
        totalTokens: r.totalTokens,
        cachedPromptTokens: r.cachedPromptTokens,
        thinkingTokens: r.thinkingTokens,
        estimatedCostUsd: r.estimatedCostUsd,
        createdAt: r.createdAt,
        userId: r.userId,
        model: r.model,
        latencyMs: r.latencyMs,
      })),
    });
    const labels = await listMatchLabels();
    dash.stats.aiUsage.crowdLabels = labels.filter((r) => r.source === "crowd").length;
    dash.stats.aiUsage.adminCrowdAgreementRate = adminCrowdAgreement(labels);
    return ok(dash);
  } catch (e) {
    return fail(e);
  }
}
