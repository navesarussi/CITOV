import type { AiUsageRecord, StoreData } from "./types";

const DEMO_USER_IDS = new Set(["demo-employee", "demo-employer"]);

/** Gemini 2.5 Flash list pricing (USD per token) — POC estimate */
export const GEMINI_FLASH_INPUT_USD = 0.075 / 1_000_000;
export const GEMINI_FLASH_OUTPUT_USD = 0.3 / 1_000_000;

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
  };
  users: number;
};

export function isDemoUserId(userId: string): boolean {
  return DEMO_USER_IDS.has(userId);
}

export function estimateAiCostUsd(promptTokens: number, completionTokens: number): number {
  return promptTokens * GEMINI_FLASH_INPUT_USD + completionTokens * GEMINI_FLASH_OUTPUT_USD;
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
    },
    users: realUsers.length,
  };
}

export function createAiUsageRecord(params: {
  id: string;
  type: AiUsageRecord["type"];
  promptTokens: number;
  completionTokens: number;
  createdAt: string;
}): AiUsageRecord {
  const totalTokens = params.promptTokens + params.completionTokens;
  return {
    id: params.id,
    type: params.type,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
    totalTokens,
    estimatedCostUsd: estimateAiCostUsd(params.promptTokens, params.completionTokens),
    createdAt: params.createdAt,
  };
}
