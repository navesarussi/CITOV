import type { AiUsageRecord } from "@/domain/types";

export type AiBudgetStatus = {
  dailyCapUsd: number;
  monthlyCapUsd: number;
  dailySpendUsd: number;
  monthlySpendUsd: number;
  dailyRatio: number;
  monthlyRatio: number;
  warn: boolean;
  blocked: boolean;
  reason: string | null;
};

function capFromEnv(name: string): number {
  const raw = process.env[name]?.trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function readAiBudgetCaps(): { daily: number; monthly: number; warnRatio: number } {
  const warnRaw = Number(process.env.AI_BUDGET_WARN_RATIO ?? "0.8");
  return {
    daily: capFromEnv("AI_BUDGET_USD_DAILY"),
    monthly: capFromEnv("AI_BUDGET_USD_MONTHLY"),
    warnRatio: Number.isFinite(warnRaw) && warnRaw > 0 && warnRaw < 1 ? warnRaw : 0.8,
  };
}

function sumSince(usage: AiUsageRecord[], sinceMs: number): number {
  return usage
    .filter((u) => new Date(u.createdAt).getTime() >= sinceMs)
    .reduce((s, u) => s + u.estimatedCostUsd, 0);
}

export function computeAiBudgetStatus(usage: AiUsageRecord[], now = Date.now()): AiBudgetStatus {
  const caps = readAiBudgetCaps();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1));
  const dailySpendUsd = sumSince(usage, dayStart.getTime());
  const monthlySpendUsd = sumSince(usage, monthStart.getTime());
  const dailyRatio = caps.daily > 0 ? dailySpendUsd / caps.daily : 0;
  const monthlyRatio = caps.monthly > 0 ? monthlySpendUsd / caps.monthly : 0;
  const ratio = Math.max(dailyRatio, monthlyRatio);
  const blocked =
    (caps.daily > 0 && dailySpendUsd >= caps.daily) ||
    (caps.monthly > 0 && monthlySpendUsd >= caps.monthly);
  const warn = !blocked && ratio >= caps.warnRatio && (caps.daily > 0 || caps.monthly > 0);
  return {
    dailyCapUsd: caps.daily,
    monthlyCapUsd: caps.monthly,
    dailySpendUsd,
    monthlySpendUsd,
    dailyRatio,
    monthlyRatio,
    warn,
    blocked,
    reason: blocked
      ? "AI budget cap reached — using heuristic mode"
      : warn
        ? "AI spend nearing budget cap"
        : null,
  };
}

export function shouldBlockGeminiForBudget(status: AiBudgetStatus): boolean {
  return status.blocked;
}
