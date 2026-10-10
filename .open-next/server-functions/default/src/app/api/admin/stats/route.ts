import { getAdminDashboard } from "@/application/admin";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { listAiUsageRows } from "@/infrastructure/db/ai-usage";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

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
    return ok(dash);
  } catch (e) {
    return fail(e);
  }
}
