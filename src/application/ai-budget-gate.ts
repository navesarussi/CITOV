import { computeAiBudgetStatus, shouldBlockGeminiForBudget } from "@/application/ai-budget";
import { recordAppEventSafe } from "@/infrastructure/db/app-events";
import { listAiUsageSince } from "@/infrastructure/db/ai-usage-query";

let lastBlockedLog = 0;

export async function isAiBudgetBlocked(): Promise<boolean> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const usage = await listAiUsageSince(monthStart.toISOString());
  const status = computeAiBudgetStatus(usage);
  const blocked = shouldBlockGeminiForBudget(status);
  if (blocked && Date.now() - lastBlockedLog > 60_000) {
    lastBlockedLog = Date.now();
    recordAppEventSafe({
      kind: "ai_budget",
      severity: "critical",
      message: status.reason ?? "AI budget exceeded",
      meta: status as unknown as Record<string, unknown>,
    });
  } else if (status.warn && Date.now() - lastBlockedLog > 300_000) {
    recordAppEventSafe({
      kind: "ai_budget",
      severity: "warn",
      message: status.reason ?? "AI budget warning",
      meta: status as unknown as Record<string, unknown>,
    });
  }
  return blocked;
}
