import { estimateCacheSavingsUsd } from "@/domain/ai-pricing";
import type { AiUsageRecord, AiUsageType } from "@/domain/types";
import { computeAiBudgetStatus } from "@/application/ai-budget";
import type { AiUsageRow } from "@/infrastructure/db/ai-usage";

export type AiFeatureKey = "chat" | "cv" | "embedding" | "job" | "matching" | "translation" | "other";

const FEATURE_LABELS_HE: Record<AiFeatureKey, string> = {
  chat: "צ'אט (סוכן)",
  cv: "ניתוח קורות חיים",
  embedding: "Embeddings / התאמות",
  job: "ייבוא משרות",
  matching: "הסבר התאמות",
  translation: "תרגום תצוגה",
  other: "אחר",
};

export function aiUsageFeature(type: AiUsageType): AiFeatureKey {
  switch (type) {
    case "employee_intake":
    case "employer_intake":
    case "admin_intake":
      return "chat";
    case "cv_import":
    case "cv_extraction":
      return "cv";
    case "embedding":
      return "embedding";
    case "job_import":
      return "job";
    case "enrich_reason":
      return "matching";
    default:
      return "other";
  }
}

export type AdminAiUsageDashboard = {
  featureLabels: typeof FEATURE_LABELS_HE;
  totals: {
    todayUsd: number;
    last7dUsd: number;
    monthUsd: number;
    allTimeUsd: number;
    todayCalls: number;
    last7dCalls: number;
    monthCalls: number;
  };
  tokens: {
    input: number;
    output: number;
    cached: number;
    total: number;
  };
  cacheSavingsUsd: number;
  avgCostPerChatCallUsd: number | null;
  byFeature: { key: AiFeatureKey; label: string; calls: number; tokens: number; costUsd: number }[];
  byModel: { model: string; calls: number; tokens: number; costUsd: number }[];
  byType: { type: AiUsageType; calls: number; tokens: number; costUsd: number }[];
  topUsers: { userId: string; name: string; calls: number; costUsd: number }[];
  byDay: { day: string; costUsd: number; calls: number; tokens: number }[];
  budget: ReturnType<typeof computeAiBudgetStatus>;
  recentCalls: AiUsageRow[];
};

function windowStart(days: number): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.getTime();
}

export function buildAdminAiUsageDashboard(rows: AiUsageRow[]): AdminAiUsageDashboard {
  const now = Date.now();
  const todayStart = windowStart(1);
  const weekStart = windowStart(7);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();

  let todayUsd = 0;
  let last7dUsd = 0;
  let monthUsd = 0;
  let allTimeUsd = 0;
  let todayCalls = 0;
  let last7dCalls = 0;
  let monthCalls = 0;
  let input = 0;
  let output = 0;
  let cached = 0;
  let cacheSavingsUsd = 0;
  let chatCalls = 0;
  let chatCost = 0;

  const byFeatureMap = new Map<AiFeatureKey, { calls: number; tokens: number; costUsd: number }>();
  const byModelMap = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  const byTypeMap = new Map<AiUsageType, { calls: number; tokens: number; costUsd: number }>();
  const byUserMap = new Map<string, { name: string; calls: number; costUsd: number }>();
  const byDayMap = new Map<string, { costUsd: number; calls: number; tokens: number }>();

  for (const r of rows) {
    const t = new Date(r.createdAt).getTime();
    const cost = r.estimatedCostUsd;
    allTimeUsd += cost;
    input += r.promptTokens;
    output += r.completionTokens + (r.thinkingTokens ?? 0);
    cached += r.cachedPromptTokens ?? 0;
    cacheSavingsUsd += estimateCacheSavingsUsd("gemini-2.5-flash", r.cachedPromptTokens ?? 0);

    if (t >= todayStart) {
      todayUsd += cost;
      todayCalls += 1;
    }
    if (t >= weekStart) {
      last7dUsd += cost;
      last7dCalls += 1;
    }
    if (t >= monthStartMs) {
      monthUsd += cost;
      monthCalls += 1;
    }

    const feat = aiUsageFeature(r.type);
    if (feat === "chat") {
      chatCalls += 1;
      chatCost += cost;
    }

    const fPrev = byFeatureMap.get(feat) ?? { calls: 0, tokens: 0, costUsd: 0 };
    fPrev.calls += 1;
    fPrev.tokens += r.totalTokens;
    fPrev.costUsd += cost;
    byFeatureMap.set(feat, fPrev);

    const model = r.model?.trim() || "gemini-2.5-flash";
    const mPrev = byModelMap.get(model) ?? { calls: 0, tokens: 0, costUsd: 0 };
    mPrev.calls += 1;
    mPrev.tokens += r.totalTokens;
    mPrev.costUsd += cost;
    byModelMap.set(model, mPrev);

    const tPrev = byTypeMap.get(r.type) ?? { calls: 0, tokens: 0, costUsd: 0 };
    tPrev.calls += 1;
    tPrev.tokens += r.totalTokens;
    tPrev.costUsd += cost;
    byTypeMap.set(r.type, tPrev);

    if (r.userId) {
      const uPrev = byUserMap.get(r.userId) ?? {
        name: r.userName?.trim() || r.userId.slice(0, 12),
        calls: 0,
        costUsd: 0,
      };
      uPrev.calls += 1;
      uPrev.costUsd += cost;
      byUserMap.set(r.userId, uPrev);
    }

    const day = r.createdAt.slice(0, 10);
    const dPrev = byDayMap.get(day) ?? { costUsd: 0, calls: 0, tokens: 0 };
    dPrev.calls += 1;
    dPrev.tokens += r.totalTokens;
    dPrev.costUsd += cost;
    byDayMap.set(day, dPrev);
  }

  const usageForBudget: AiUsageRecord[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    promptTokens: r.promptTokens,
    completionTokens: r.completionTokens,
    totalTokens: r.totalTokens,
    cachedPromptTokens: r.cachedPromptTokens,
    thinkingTokens: r.thinkingTokens,
    estimatedCostUsd: r.estimatedCostUsd,
    createdAt: r.createdAt,
  }));

  return {
    featureLabels: FEATURE_LABELS_HE,
    totals: {
      todayUsd,
      last7dUsd,
      monthUsd,
      allTimeUsd,
      todayCalls,
      last7dCalls,
      monthCalls,
    },
    tokens: {
      input,
      output,
      cached,
      total: input + output,
    },
    cacheSavingsUsd,
    avgCostPerChatCallUsd: chatCalls > 0 ? chatCost / chatCalls : null,
    byFeature: [...byFeatureMap.entries()]
      .map(([key, v]) => ({ key, label: FEATURE_LABELS_HE[key], ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
    byModel: [...byModelMap.entries()]
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
    byType: [...byTypeMap.entries()]
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
    topUsers: [...byUserMap.entries()]
      .map(([userId, v]) => ({ userId, name: v.name, calls: v.calls, costUsd: v.costUsd }))
      .sort((a, b) => b.costUsd - a.costUsd)
      .slice(0, 12),
    byDay: [...byDayMap.entries()]
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, 31),
    budget: computeAiBudgetStatus(usageForBudget, now),
    recentCalls: rows.slice(0, 50),
  };
}
