import { computeAdminStats } from "@/domain/admin";
import type { AdminSettings, StoreData } from "@/domain/types";
import { resolveAdminSettings } from "@/infrastructure/ai/prompts";

export function getAdminDashboard(store: StoreData) {
  const settings = resolveAdminSettings(store.adminSettings);
  return {
    stats: computeAdminStats(store),
    prompts: {
      candidatePrompt: settings.candidatePrompt,
      employerPrompt: settings.employerPrompt,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    },
  };
}

export function updateAdminPrompts(
  store: StoreData,
  params: { candidatePrompt: string; employerPrompt: string; updatedBy: string },
): StoreData {
  const now = new Date().toISOString();
  const adminSettings: AdminSettings = {
    candidatePrompt: params.candidatePrompt.trim(),
    employerPrompt: params.employerPrompt.trim(),
    updatedAt: now,
    updatedBy: params.updatedBy,
  };
  return { ...store, adminSettings };
}
