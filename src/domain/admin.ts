import { isAdminSandboxUserId } from "@/domain/admin-sandbox";
import { storeEngagementStats } from "@/domain/admin-engagement";
import { estimateCacheSavingsUsd, estimateCostUsd, GEMINI_PRICING } from "@/domain/ai-pricing";
import type { AiUsageRecord, AiUsageType, StoreData } from "./types";

const DEMO_USER_IDS = new Set(["demo-employee", "demo-employer"]);

export { GEMINI_PRICING };
/** @deprecated use estimateCostUsd */
export const GEMINI_FLASH_INPUT_USD = GEMINI_PRICING["gemini-2.5-flash"].input;
export const GEMINI_FLASH_OUTPUT_USD = GEMINI_PRICING["gemini-2.5-flash"].output;

export type AdminStats = {
  employers: number;
  candidates: number;
  matches: {
    total: number;
    queued: number;
    approved: number;
    rejected: number;
  };
  aiUsage: {
    totalCalls: number;
    totalTokens: number;
    estimatedCostUsd: number;
    last24hCalls: number;
    last24hTokens: number;
    last24hCostUsd: number;
    byType: {
      type: AiUsageType;
      calls: number;
      tokens: number;
      costUsd: number;
      cachedTokens: number;
    }[];
    totalCachedTokens: number;
    estimatedCacheSavingsUsd: number;
    byDay: { day: string; costUsd: number; calls: number; tokens: number }[];
    crowdLabels: number;
    adminCrowdAgreementRate: number | null;
  };
  engagement: {
    avgCandidateKnowledgePercent: number;
    avgJobKnowledgePercent: number;
    avgCandidateUserMessages: number;
    avgEmployerUserMessages: number;
  };
  users: number;
  reliability: {
    averageScore: number;
    openNotes: number;
    lowScoreCandidates: { userId: string; name: string; score: number; openNotes: number }[];
  };
};

export function isDemoUserId(userId: string): boolean {
  return DEMO_USER_IDS.has(userId) || userId.startsWith("seed-") || isAdminSandboxUserId(userId);
}

export function estimateAiCostUsd(
  promptTokens: number,
  completionTokens: number,
  cachedPromptTokens = 0,
  thinkingTokens = 0,
): number {
  return (
    estimateCostUsd("gemini-2.5-flash", promptTokens, completionTokens, cachedPromptTokens) +
    estimateCostUsd("gemini-2.5-flash", 0, thinkingTokens, 0)
  );
}

function summarizeAiUsage(usage: AiUsageRecord[]) {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const byDayMap = new Map<string, { costUsd: number; calls: number; tokens: number }>();
  const byTypeMap = new Map<
    AiUsageType,
    { calls: number; tokens: number; costUsd: number; cachedTokens: number }
  >();
  let last24hCalls = 0;
  let last24hTokens = 0;
  let last24hCostUsd = 0;
  let totalCachedTokens = 0;
  let estimatedCacheSavingsUsd = 0;
  for (const r of usage) {
    const cached = r.cachedPromptTokens ?? 0;
    totalCachedTokens += cached;
    estimatedCacheSavingsUsd += estimateCacheSavingsUsd("gemini-2.5-flash", cached);
    const prev = byTypeMap.get(r.type) ?? { calls: 0, tokens: 0, costUsd: 0, cachedTokens: 0 };
    prev.calls += 1;
    prev.tokens += r.totalTokens;
    prev.costUsd += r.estimatedCostUsd;
    prev.cachedTokens += cached;
    byTypeMap.set(r.type, prev);
    const day = r.createdAt.slice(0, 10);
    const dayPrev = byDayMap.get(day) ?? { costUsd: 0, calls: 0, tokens: 0 };
    dayPrev.calls += 1;
    dayPrev.tokens += r.totalTokens;
    dayPrev.costUsd += r.estimatedCostUsd;
    byDayMap.set(day, dayPrev);
    if (new Date(r.createdAt).getTime() >= since) {
      last24hCalls += 1;
      last24hTokens += r.totalTokens;
      last24hCostUsd += r.estimatedCostUsd;
    }
  }
  return {
    byType: [...byTypeMap.entries()]
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
    last24hCalls,
    last24hTokens,
    last24hCostUsd,
    totalCachedTokens,
    estimatedCacheSavingsUsd,
    byDay: [...byDayMap.entries()]
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, 14),
  };
}

export function renderPromptTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function computeAdminStats(store: StoreData): AdminStats {
  const realEmployees = store.employees.filter((e) => !isDemoUserId(e.userId));
  const realEmployers = store.employers.filter((e) => !isDemoUserId(e.userId));
  const realUsers = store.users.filter((u) => !isDemoUserId(u.id));
  const usage = store.aiUsage ?? [];

  const reliabilityRows = realEmployees.map((e) => {
    const score = e.cv?.reliability?.score ?? 100;
    const openNotes = (e.cv?.reliability?.notes ?? []).filter((n) => n.status === "open").length;
    const name = store.users.find((u) => u.id === e.userId)?.name ?? e.userId;
    return { userId: e.userId, name, score, openNotes };
  });
  const averageScore =
    reliabilityRows.length === 0
      ? 100
      : Math.round(
          reliabilityRows.reduce((sum, r) => sum + r.score, 0) / reliabilityRows.length,
        );
  const openNotes = reliabilityRows.reduce((sum, r) => sum + r.openNotes, 0);
  const lowScoreCandidates = [...reliabilityRows]
    .filter((r) => r.score < 100 || r.openNotes > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 8);

  return {
    employers: realEmployers.length,
    candidates: realEmployees.length,
    matches: {
      total: store.matches.length,
      queued: store.matches.filter((m) => m.status === "queued").length,
      approved: store.matches.filter((m) => m.status === "approved").length,
      rejected: store.matches.filter((m) => m.status === "rejected").length,
    },
    aiUsage: {
      totalCalls: usage.length,
      totalTokens: usage.reduce((sum, r) => sum + r.totalTokens, 0),
      estimatedCostUsd: usage.reduce((sum, r) => sum + r.estimatedCostUsd, 0),
      ...summarizeAiUsage(usage),
      crowdLabels: 0,
      adminCrowdAgreementRate: null,
    },
    engagement: storeEngagementStats(store),
    users: realUsers.length,
    reliability: {
      averageScore,
      openNotes,
      lowScoreCandidates,
    },
  };
}

export function createAiUsageRecord(params: {
  id: string;
  type: AiUsageRecord["type"];
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens?: number;
  thinkingTokens?: number;
  createdAt: string;
}): AiUsageRecord {
  const thinkingTokens = params.thinkingTokens ?? 0;
  const totalTokens = params.promptTokens + params.completionTokens + thinkingTokens;
  const cachedPromptTokens = params.cachedPromptTokens ?? 0;
  return {
    id: params.id,
    type: params.type,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
    totalTokens,
    cachedPromptTokens: cachedPromptTokens > 0 ? cachedPromptTokens : undefined,
    thinkingTokens: thinkingTokens > 0 ? thinkingTokens : undefined,
    estimatedCostUsd: estimateAiCostUsd(
      params.promptTokens,
      params.completionTokens,
      cachedPromptTokens,
      thinkingTokens,
    ),
    createdAt: params.createdAt,
  };
}
