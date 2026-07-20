import { computeAdminStats } from "@/domain/admin";
import { PROMPT_BUNDLE_VERSION, type AdminSettings, type StoreData } from "@/domain/types";
import {
  clearDefaultPromptCache,
  getDefaultCandidatePrompt,
  getDefaultEmployerPrompt,
  hasCustomAdminPrompts,
  resolveAdminSettings,
} from "@/infrastructure/ai/prompts";

export function getAdminDashboard(store: StoreData) {
  const settings = resolveAdminSettings(store.adminSettings);
  return {
    stats: computeAdminStats(store),
    prompts: {
      candidatePrompt: settings.candidatePrompt,
      employerPrompt: settings.employerPrompt,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
      isCustom: hasCustomAdminPrompts(store.adminSettings),
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
    promptBundleVersion: PROMPT_BUNDLE_VERSION,
  };
  return { ...store, adminSettings };
}

/** Clears DB override so file prompts become live again. */
export function resetAdminPrompts(store: StoreData): StoreData {
  clearDefaultPromptCache();
  const { adminSettings: _removed, ...rest } = store;
  return {
    ...rest,
    adminSettings: undefined,
  };
}

export function defaultPromptSnapshot() {
  clearDefaultPromptCache();
  return {
    candidatePrompt: getDefaultCandidatePrompt(),
    employerPrompt: getDefaultEmployerPrompt(),
  };
}
