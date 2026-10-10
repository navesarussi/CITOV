import { renderPromptTemplate } from "@/domain/admin";
import {
  PROMPT_DEFINITIONS,
  getPromptDefinition,
  type PromptDefinition,
} from "@/domain/prompt-registry";
import { emptyCandidateCard, emptyJobCard, PROMPT_BUNDLE_VERSION, type AdminSettings } from "@/domain/types";
import { defaultPromptBody } from "@/infrastructure/ai/prompt-defaults";
import { resolveAdminSettings } from "@/infrastructure/ai/prompts";
import {
  getActivePromptBody,
  getActivePromptMeta,
  listPromptVersions,
  resolvePromptText,
  rollbackPromptVersion,
  savePromptVersion,
  type PromptVersionRow,
} from "@/infrastructure/db/prompt-versions";
import { upsertAdminSettings } from "@/infrastructure/db/normalized-store";
import {
  defaultRuleBasedMatcher,
  evaluateMatcherOnDataset,
} from "@/domain/matching-eval/evaluate";
import { matchingEvalDataset } from "@/application/eval-matching-dataset";

export type PromptCatalogCard = {
  id: string;
  nameHe: string;
  purposeHe: string;
  whenSentHe: string;
  category: PromptDefinition["category"];
  supportsEval: boolean;
  activeVersion: number | null;
  updatedAt: string | null;
  updatedBy: string | null;
  isCustom: boolean;
};

export type PromptCatalogDetail = {
  definition: PromptDefinition;
  activeBody: string;
  defaultBody: string;
  activeVersion: number | null;
  updatedAt: string | null;
  updatedBy: string | null;
  versions: PromptVersionRow[];
};

export async function listPromptCatalog(): Promise<PromptCatalogCard[]> {
  const cards: PromptCatalogCard[] = [];
  for (const def of PROMPT_DEFINITIONS) {
    const meta = await getActivePromptMeta(def.id);
    const activeBody = await resolvePromptText(def.id);
    const defaultBody = defaultPromptBody(def.id);
    cards.push({
      id: def.id,
      nameHe: def.nameHe,
      purposeHe: def.purposeHe,
      whenSentHe: def.whenSentHe,
      category: def.category,
      supportsEval: Boolean(def.supportsEval),
      activeVersion: meta?.version ?? null,
      updatedAt: meta?.updatedAt ?? null,
      updatedBy: meta?.updatedBy ?? null,
      isCustom: activeBody.trim() !== defaultBody.trim(),
    });
  }
  return cards;
}

export async function getPromptCatalogDetail(promptKey: string): Promise<PromptCatalogDetail | null> {
  const definition = getPromptDefinition(promptKey);
  if (!definition) return null;
  const [activeBody, meta, versions] = await Promise.all([
    resolvePromptText(promptKey),
    getActivePromptMeta(promptKey),
    listPromptVersions(promptKey, 30),
  ]);
  return {
    definition,
    activeBody,
    defaultBody: defaultPromptBody(promptKey),
    activeVersion: meta?.version ?? null,
    updatedAt: meta?.updatedAt ?? null,
    updatedBy: meta?.updatedBy ?? null,
    versions,
  };
}

async function syncLegacyChatSettings(params: {
  adminSettings?: Partial<AdminSettings>;
  candidatePrompt: string;
  employerPrompt: string;
  updatedBy: string;
}): Promise<void> {
  await upsertAdminSettings({
    candidatePrompt: params.candidatePrompt,
    employerPrompt: params.employerPrompt,
    updatedAt: new Date().toISOString(),
    updatedBy: params.updatedBy,
    promptBundleVersion: PROMPT_BUNDLE_VERSION,
    matchQueueThreshold: params.adminSettings?.matchQueueThreshold,
  });
}

export async function saveCatalogPrompt(params: {
  promptKey: string;
  body: string;
  createdBy: string;
  adminSettings?: Partial<AdminSettings>;
}): Promise<PromptVersionRow> {
  const row = await savePromptVersion({
    promptKey: params.promptKey,
    body: params.body.trim(),
    createdBy: params.createdBy,
  });
  const def = getPromptDefinition(params.promptKey);
  if (def?.legacyAdminField === "candidate") {
    const employer = await resolvePromptText("employer_chat");
    await syncLegacyChatSettings({
      adminSettings: params.adminSettings,
      candidatePrompt: params.body.trim(),
      employerPrompt: employer,
      updatedBy: params.createdBy,
    });
  } else if (def?.legacyAdminField === "employer") {
    const candidate = await resolvePromptText("candidate_chat");
    await syncLegacyChatSettings({
      adminSettings: params.adminSettings,
      candidatePrompt: candidate,
      employerPrompt: params.body.trim(),
      updatedBy: params.createdBy,
    });
  }
  return row;
}

export async function rollbackCatalogPrompt(params: {
  promptKey: string;
  version: number;
  rolledBackBy: string;
  adminSettings?: Partial<AdminSettings>;
}): Promise<PromptVersionRow | null> {
  const row = await rollbackPromptVersion(params);
  if (!row) return null;
  const def = getPromptDefinition(params.promptKey);
  if (def?.legacyAdminField === "candidate") {
    const employer = await resolvePromptText("employer_chat");
    await syncLegacyChatSettings({
      adminSettings: params.adminSettings,
      candidatePrompt: row.body,
      employerPrompt: employer,
      updatedBy: params.rolledBackBy,
    });
  } else if (def?.legacyAdminField === "employer") {
    const candidate = await resolvePromptText("candidate_chat");
    await syncLegacyChatSettings({
      adminSettings: params.adminSettings,
      candidatePrompt: candidate,
      employerPrompt: row.body,
      updatedBy: params.rolledBackBy,
    });
  }
  return row;
}

export function samplePreviewForPrompt(promptKey: string, body: string): string {
  switch (promptKey) {
    case "candidate_chat":
    case "employer_chat": {
      const card =
        promptKey === "candidate_chat" ? emptyCandidateCard() : emptyJobCard();
      return renderPromptTemplate(body, {
        known_facts:
          promptKey === "candidate_chat" ? "תפקיד: מלצר · חיפה" : "משרה: קופאי · תל אביב",
        current_card: JSON.stringify(card, null, 2).slice(0, 500),
        missing_field_key:
          promptKey === "candidate_chat" ? "location (מיקום)" : "mustHaves (דרישות)",
        pending_field_questions: "- [q1] באיזה אזור נוח לך לעבוד?",
        recent_agent_questions: "- ספר/י על הניסיון האחרון",
      });
    }
    case "match_reason_enrich":
      return renderPromptTemplate(body, {
        candidateSummary: "מלצר/ית, 3 שנות ניסיון, חיפה",
        jobSummary: "קופאי/ת, משרה מלאה, תל אביב",
        reason: "התאמה בתפקיד שירות וזמינות גיאוגרפית",
      });
    case "card_display_translation":
      return renderPromptTemplate(body, {
        targetLocale: "he",
        fields: JSON.stringify({ desiredRole: "Waiter", narrative: "Experienced in hospitality." }, null, 2),
      });
    default:
      return body;
  }
}

export type PromptEvalSummary = {
  promptKey: string;
  labeledPairs: number;
  precisionAt5: number;
  recallAt5: number;
  mrr: number;
  ndcgAt5: number;
  goodMissed: number;
  badQueued: number;
  noteHe: string;
};

export function runPromptEval(promptKey: string): PromptEvalSummary {
  if (!getPromptDefinition(promptKey)?.supportsEval) {
    throw new Error("eval not supported");
  }
  const r = evaluateMatcherOnDataset(matchingEvalDataset, defaultRuleBasedMatcher, 5, 0.28);
  return {
    promptKey,
    labeledPairs: matchingEvalDataset.labels.length,
    precisionAt5: r.macroPrecisionAtK,
    recallAt5: r.macroRecallAtK,
    mrr: r.mrr,
    ndcgAt5: r.macroNdcgAtK,
    goodMissed: r.confusion.goodMissed.length,
    badQueued: r.confusion.badQueued.length,
    noteHe:
      promptKey === "match_reason_enrich"
        ? "הערכת בסיס rule-based על מערך התיוג — לבדיקת יציבות לפני שינוי ניסוח."
        : "הערכת התאמה rule-based על מערך התיוג — פרומפטי צ'אט משפיעים בעיקר על איסוף כרטיס, לא על ציון זה ישירות.",
  };
}

export async function resolveLiveChatPrompts(
  adminSettings?: Partial<AdminSettings>,
): Promise<{ candidatePrompt: string; employerPrompt: string }> {
  const [cVersion, eVersion, legacy] = await Promise.all([
    getActivePromptBody("candidate_chat"),
    getActivePromptBody("employer_chat"),
    Promise.resolve(resolveAdminSettings(adminSettings)),
  ]);
  return {
    candidatePrompt: cVersion?.trim() ? cVersion : legacy.candidatePrompt,
    employerPrompt: eVersion?.trim() ? eVersion : legacy.employerPrompt,
  };
}
