import { randomUUID } from "crypto";
import { NotFoundError } from "@/domain/errors";
import { defaultGeminiModelId } from "@/infrastructure/ai/gemini-client";
import { buildAiUsageRecord } from "@/infrastructure/db/ai-usage";
import {
  getActiveJob,
  normalizeEmployerRecord,
  updateJobSlot,
  withActiveJob,
} from "@/domain/employer-jobs";
import {
  mergeAnswerIntoCard,
  unansweredQuestionsForCandidate,
} from "@/domain/field-questions";
import {
  formatOpenReliabilityNotesForPrompt,
  formatPendingConflictsForPrompt,
  formatPendingInferencesForPrompt,
  openChatConflictOnCard,
  resolveConflictsFromPatch,
  resolvePendingInferencesFromPatch,
} from "@/domain/cv-merge";
import {
  detectIdentityResolution,
  tryResolveIdentityFromMessage,
} from "@/application/cv-identity";
import {
  ensureProfilePack,
  getIdentityStaging,
  persistActiveProfile,
} from "@/domain/candidate-profiles";
import { firstNameFromFullName } from "@/domain/person-name";
import {
  inferMatchCanonicalFromText,
  mergeMatchCanonical,
} from "@/domain/match-canonical";
import type {
  AiUsageRecord,
  CandidateCard,
  CandidateCvProfile,
  ChatMessage,
  FieldAnswer,
  FieldQuestion,
  JobCard,
  StoreData,
} from "@/domain/types";
import { emptyCvProfile } from "@/domain/types";
import { resolveLiveChatPrompts } from "@/application/admin-prompt-catalog";
import { formatPendingJobConfirmationsForPrompt } from "@/domain/cv-merge";
import { resolveJobImportConfirmationsFromPatch } from "@/domain/job-extraction-merge";
import type { AiTokenUsage, CandidatePatch, JobPatch } from "@/infrastructure/ai/schemas";

function isEmptyCardValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return false;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function norm(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(String).join(", ");
  return String(v).trim();
}

function ensureCv(cv?: CandidateCvProfile): CandidateCvProfile {
  const base = emptyCvProfile();
  if (!cv) return base;
  return {
    ...base,
    ...cv,
    workHistory: cv.workHistory ?? [],
    educationHistory: cv.educationHistory ?? [],
    unmappedFacts: cv.unmappedFacts ?? [],
    fieldEvidence: cv.fieldEvidence ?? [],
    conflicts: cv.conflicts ?? [],
    documents: cv.documents ?? [],
    pendingInferences: cv.pendingInferences ?? [],
    reliability: cv.reliability ?? base.reliability,
  };
}

/** Fill empty / same values; open chat_internal conflict on differing non-empty values. */
function applyCandidatePatchSafely(
  card: CandidateCard,
  cv: CandidateCvProfile | undefined,
  patch?: CandidatePatch,
  now = new Date().toISOString(),
): { card: CandidateCard; cv: CandidateCvProfile | undefined } {
  if (!patch) return { card, cv: cv ? ensureCv(cv) : cv };
  let nextCard = {
    ...card,
    workHistory: card.workHistory ?? [],
    educationHistory: card.educationHistory ?? [],
  };
  let nextCv = cv ? ensureCv(cv) : undefined;
  const skip = new Set(["flexibility", "workHistory", "educationHistory"]);

  for (const [key, raw] of Object.entries(patch)) {
    if (raw === undefined || skip.has(key)) continue;
    if (key === "skills" || key === "softSkills" || key === "languages") {
      const incoming = raw as string[];
      if (!incoming?.length) continue;
      const prev = (nextCard[key as "skills"] as string[]) ?? [];
      const seen = new Set(prev.map((s) => s.toLowerCase()));
      const merged = [...prev];
      for (const item of incoming) {
        if (!item.trim() || seen.has(item.toLowerCase())) continue;
        seen.add(item.toLowerCase());
        merged.push(item);
      }
      nextCard = { ...nextCard, [key]: merged };
      continue;
    }
    if (key === "extras" && raw && typeof raw === "object") {
      nextCard = {
        ...nextCard,
        extras: { ...nextCard.extras, ...(raw as Record<string, string>) },
      };
      continue;
    }
    const prevVal = (nextCard as Record<string, unknown>)[key];
    if (isEmptyCardValue(prevVal)) {
      nextCard = { ...nextCard, [key]: raw } as CandidateCard;
      continue;
    }
    if (norm(prevVal) === norm(raw)) continue;
    nextCv = openChatConflictOnCard(
      nextCv ?? emptyCvProfile(),
      key,
      norm(prevVal),
      norm(raw),
      now,
    );
  }

  if (patch.matchCanonical) {
    nextCard = mergeMatchCanonical(nextCard, patch.matchCanonical);
  } else if (patch.desiredRole || patch.field || patch.skills?.length) {
    nextCard = mergeMatchCanonical(
      nextCard,
      inferMatchCanonicalFromText({
        desiredRole: nextCard.desiredRole,
        field: nextCard.field,
        skills: nextCard.skills,
        languages: nextCard.languages,
      }),
    );
  }

  return { card: nextCard, cv: nextCv };
}

function applyCandidatePatch(card: CandidateCard, patch?: CandidatePatch): CandidateCard {
  return applyCandidatePatchSafely(card, undefined, patch).card;
}

function applyJobPatch(card: JobCard, patch?: JobPatch): JobCard {
  if (!patch) return card;
  let next: JobCard = {
    ...card,
    ...patch,
    mustHaves: patch.mustHaves ?? card.mustHaves,
    niceToHaves: patch.niceToHaves ?? card.niceToHaves,
    requiredLanguages: patch.requiredLanguages ?? card.requiredLanguages,
    interviewSlots: patch.interviewSlots ?? card.interviewSlots,
    extras: { ...card.extras, ...(patch.extras ?? {}) },
  };
  if (patch.matchCanonical) {
    next = mergeMatchCanonical(next, patch.matchCanonical);
  } else if (patch.title || patch.field || patch.mustHaves?.length) {
    next = mergeMatchCanonical(
      next,
      inferMatchCanonicalFromText({
        title: next.title,
        field: next.field,
        mustHaves: next.mustHaves,
        languages: next.requiredLanguages,
      }),
    );
  }
  return next;
}

function makeMessage(role: "user" | "assistant", content: string): ChatMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function collectUsageRecords(
  userId: string,
  type: AiUsageRecord["type"],
  usages: (AiTokenUsage | undefined)[],
  latencyMs?: number,
): AiUsageRecord[] {
  const model = defaultGeminiModelId();
  const out: AiUsageRecord[] = [];
  for (const usage of usages) {
    const rec = buildAiUsageRecord({
      type,
      usage,
      userId,
      model,
      latencyMs,
    });
    if (rec) out.push(rec);
  }
  return out;
}

export type ChatTurnResult = {
  store: StoreData;
  reply: string;
  provider: string;
  aiDegraded?: boolean;
  card: CandidateCard | JobCard;
  chat: ChatMessage[];
  pendingQuestions: { id: string; question: string }[];
  jobId?: string;
  newMessages: ChatMessage[];
  newFieldAnswers: FieldAnswer[];
  usageRecord?: AiUsageRecord;
  usageRecords?: AiUsageRecord[];
  cv?: CandidateCvProfile;
};

export async function prepareEmployeeTurn(
  store: StoreData,
  userId: string,
): Promise<{
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
  systemPrompt: string;
  pendingConflicts: string;
  pendingInferences: string;
  openReliabilityNotes: string;
  cv?: CandidateCvProfile;
}> {
  const raw = store.employees.find((e) => e.userId === userId);
  if (!raw) throw new NotFoundError("Employee");
  const accountLabel =
    firstNameFromFullName(store.users.find((u) => u.id === userId)?.name ?? "") ?? "אני";
  const emp = ensureProfilePack(raw, accountLabel);
  const prompts = await resolveLiveChatPrompts(store.adminSettings);
  return {
    card: emp.card,
    chat: emp.chat,
    pendingQuestions: unansweredQuestionsForCandidate(
      emp.card,
      store.fieldQuestions,
      store.fieldAnswers,
      userId,
    ),
    systemPrompt: prompts.candidatePrompt,
    pendingConflicts: formatPendingConflictsForPrompt(emp.cv),
    pendingInferences: formatPendingInferencesForPrompt(emp.cv),
    openReliabilityNotes: formatOpenReliabilityNotesForPrompt(emp.cv),
    cv: emp.cv,
  };
}

export async function prepareEmployerTurn(
  store: StoreData,
  userId: string,
  jobId?: string,
): Promise<{
  card: JobCard;
  chat: ChatMessage[];
  systemPrompt: string;
  jobId: string;
  pendingJobConfirmations: string;
}> {
  const raw = store.employers.find((e) => e.userId === userId);
  if (!raw) throw new NotFoundError("Employer");
  let employer = normalizeEmployerRecord(raw);
  if (jobId) employer = withActiveJob(employer, jobId);
  const active = getActiveJob(employer);
  const prompts = await resolveLiveChatPrompts(store.adminSettings);
  const pending = active.importMeta?.pendingConfirmations?.filter((p) => p.status === "pending") ?? [];
  return {
    card: active.card,
    chat: active.chat,
    systemPrompt: prompts.employerPrompt,
    jobId: active.id,
    pendingJobConfirmations: formatPendingJobConfirmationsForPrompt(pending),
  };
}

const DEGRADED_NOTICE_HE = "העוזר עובד כרגע במצב מוגבל";

export function applyEmployeeTurn(params: {
  store: StoreData;
  userId: string;
  message: string;
  reply: string;
  candidatePatch?: CandidatePatch;
  fieldAnswers?: { questionId: string; answer: string }[];
  usage?: AiTokenUsage;
  replyUsage?: AiTokenUsage;
  provider: string;
  aiDegraded?: boolean;
}): ChatTurnResult {
  let store = params.store;
  const { userId, message } = params;
  let reply = params.reply;

  const empBefore = store.employees.find((e) => e.userId === userId);
  if (empBefore && getIdentityStaging(empBefore) && detectIdentityResolution(message)) {
    const resolved = tryResolveIdentityFromMessage(store, userId, message);
    if (resolved) {
      store = resolved;
      const stagingName = empBefore.cv?.identityStaging?.cvPersonName ?? "";
      reply =
        detectIdentityResolution(message) === "self"
          ? "מעולה, נמשיך עם קורות החיים שלך."
          : `מעולה — יצרתי פרופיל נפרד עבור ${stagingName}. אפשר לעבור ביניהם בתפריט הפרופילים.`;
    }
  }

  const emp = store.employees.find((e) => e.userId === userId);
  if (!emp) throw new NotFoundError("Employee");

  if (params.aiDegraded && !reply.includes(DEGRADED_NOTICE_HE)) {
    reply = `${DEGRADED_NOTICE_HE}\n\n${reply}`;
  }

  // Resolve pre-existing conflicts / inferences before opening new ones
  let cv =
    resolvePendingInferencesFromPatch(
      resolveConflictsFromPatch(emp.cv, params.candidatePatch ?? {}),
      params.candidatePatch ?? {},
    ) ?? emp.cv;

  let card = { ...emp.card };
  for (const c of cv?.conflicts ?? []) {
    if (c.status === "resolved" && c.resolvedValue) {
      const wasPending = emp.cv?.conflicts.some(
        (x) => x.id === c.id && x.status === "pending",
      );
      if (wasPending) {
        card = { ...card, [c.fieldKey]: c.resolvedValue } as CandidateCard;
      }
    }
  }
  for (const p of cv?.pendingInferences ?? []) {
    if (p.status === "accepted") {
      const wasPending = emp.cv?.pendingInferences.some(
        (x) => x.id === p.id && x.status === "pending",
      );
      if (wasPending && isEmptyCardValue((card as Record<string, unknown>)[p.fieldKey])) {
        card = { ...card, [p.fieldKey]: p.value } as CandidateCard;
      }
    }
  }

  const applied = applyCandidatePatchSafely(card, cv, params.candidatePatch);
  card = applied.card;
  cv = applied.cv;

  let answers = store.fieldAnswers;
  let pendingIds = emp.pendingFieldQuestionIds;
  const newFieldAnswers: FieldAnswer[] = [];

  for (const fa of params.fieldAnswers ?? []) {
    const q = store.fieldQuestions.find((x) => x.id === fa.questionId);
    if (!q) continue;
    card = mergeAnswerIntoCard(card, q, fa.answer);
    const answer: FieldAnswer = {
      questionId: fa.questionId,
      candidateId: userId,
      answer: fa.answer,
      answeredAt: new Date().toISOString(),
    };
    answers = [
      ...answers.filter(
        (a) => !(a.questionId === fa.questionId && a.candidateId === userId),
      ),
      answer,
    ];
    newFieldAnswers.push(answer);
    pendingIds = pendingIds.filter((id) => id !== fa.questionId);
  }

  const newMessages = [makeMessage("user", message), makeMessage("assistant", reply)];
  const usageRecords = collectUsageRecords(userId, "employee_intake", [
    params.usage,
    params.replyUsage,
  ]);
  const usageRecord = usageRecords[0];
  const next: StoreData = {
    ...store,
    fieldAnswers: answers,
    aiUsage: usageRecords.length
      ? [...(store.aiUsage ?? []), ...usageRecords].slice(-400)
      : store.aiUsage,
    employees: store.employees.map((e) => {
      if (e.userId !== userId) return e;
      return persistActiveProfile({
        ...e,
        card,
        cv,
        pendingFieldQuestionIds: pendingIds,
        chat: [...e.chat, ...newMessages],
      });
    }),
  };
  const empNext = next.employees.find((e) => e.userId === userId)!;
  const pendingOut = next.fieldQuestions.filter((q) =>
    empNext.pendingFieldQuestionIds.includes(q.id),
  );
  return {
    store: next,
    reply,
    provider: params.provider,
    aiDegraded: params.aiDegraded,
    card: empNext.card,
    chat: empNext.chat,
    pendingQuestions: pendingOut.map((q) => ({ id: q.id, question: q.question })),
    newMessages,
    newFieldAnswers,
    usageRecord,
    usageRecords,
    cv: empNext.cv,
  };
}

/** Append an assistant reply when the triggering user message is already in chat. */
export function appendAssistantReply(params: {
  store: StoreData;
  userId: string;
  reply: string;
  usage?: AiTokenUsage;
  provider: string;
  aiDegraded?: boolean;
}): ChatTurnResult {
  const { store, userId, reply } = params;
  const emp = store.employees.find((e) => e.userId === userId);
  if (!emp) throw new NotFoundError("Employee");

  const assistantMsg = makeMessage("assistant", reply);
  const usageRecords = collectUsageRecords(userId, "employee_intake", [params.usage]);
  const usageRecord = usageRecords[0];
  const next: StoreData = {
    ...store,
    aiUsage: usageRecords.length
      ? [...(store.aiUsage ?? []), ...usageRecords].slice(-400)
      : store.aiUsage,
    employees: store.employees.map((e) => {
      if (e.userId !== userId) return e;
      return persistActiveProfile({ ...e, chat: [...e.chat, assistantMsg] });
    }),
  };
  const empNext = next.employees.find((e) => e.userId === userId)!;
  const pendingOut = next.fieldQuestions.filter((q) =>
    empNext.pendingFieldQuestionIds.includes(q.id),
  );
  return {
    store: next,
    reply,
    provider: params.provider,
    aiDegraded: params.aiDegraded,
    card: empNext.card,
    chat: empNext.chat,
    pendingQuestions: pendingOut.map((q) => ({ id: q.id, question: q.question })),
    newMessages: [assistantMsg],
    newFieldAnswers: [],
    usageRecord,
    cv: empNext.cv,
  };
}

function stripLastDegradedPair(
  store: StoreData,
  userId: string,
  role: "employee" | "employer",
  jobId?: string,
): StoreData {
  if (role === "employee") {
    const emp = store.employees.find((e) => e.userId === userId);
    if (!emp) return store;
    const chat = [...emp.chat];
    if (chat.at(-1)?.role === "assistant") chat.pop();
    if (chat.at(-1)?.role === "user") chat.pop();
    return {
      ...store,
      employees: store.employees.map((e) => (e.userId === userId ? { ...e, chat } : e)),
    };
  }
  const raw = store.employers.find((e) => e.userId === userId);
  if (!raw) return store;
  let employer = normalizeEmployerRecord(raw);
  if (jobId) employer = withActiveJob(employer, jobId);
  const active = getActiveJob(employer);
  const chat = [...active.chat];
  if (chat.at(-1)?.role === "assistant") chat.pop();
  if (chat.at(-1)?.role === "user") chat.pop();
  const updated = updateJobSlot(employer, active.id, { chat });
  return {
    ...store,
    employers: store.employers.map((e) =>
      e.userId === userId ? withActiveJob(updated, active.id) : e,
    ),
  };
}

export function applyEmployeeRecoveryTurn(
  params: Parameters<typeof applyEmployeeTurn>[0],
): ChatTurnResult {
  const store = stripLastDegradedPair(params.store, params.userId, "employee");
  return applyEmployeeTurn({ ...params, store, aiDegraded: false });
}

export function applyEmployerRecoveryTurn(
  params: Parameters<typeof applyEmployerTurn>[0],
): ChatTurnResult {
  const store = stripLastDegradedPair(
    params.store,
    params.userId,
    "employer",
    params.jobId,
  );
  return applyEmployerTurn({ ...params, store, aiDegraded: false });
}

export function applyEmployerTurn(params: {
  store: StoreData;
  userId: string;
  message: string;
  reply: string;
  jobPatch?: JobPatch;
  usage?: AiTokenUsage;
  replyUsage?: AiTokenUsage;
  provider: string;
  aiDegraded?: boolean;
  jobId?: string;
}): ChatTurnResult {
  const { store, userId, message } = params;
  let reply = params.reply;
  const raw = store.employers.find((e) => e.userId === userId);
  if (!raw) throw new NotFoundError("Employer");

  let employer = normalizeEmployerRecord(raw);
  if (params.jobId) employer = withActiveJob(employer, params.jobId);
  const active = getActiveJob(employer);

  if (params.aiDegraded && !reply.includes(DEGRADED_NOTICE_HE)) {
    reply = `${DEGRADED_NOTICE_HE}\n\n${reply}`;
  }

  const card = applyJobPatch(active.card, params.jobPatch);
  const slotAfterConfirm = resolveJobImportConfirmationsFromPatch(
    { ...active, card },
    params.jobPatch ?? {},
  );
  const newMessages = [makeMessage("user", message), makeMessage("assistant", reply)];
  const chat = [...active.chat, ...newMessages];
  const updated = updateJobSlot(employer, active.id, {
    card: slotAfterConfirm.card,
    chat,
    importMeta: slotAfterConfirm.importMeta,
  });
  const mirrored = withActiveJob(updated, active.id);
  const usageRecords = collectUsageRecords(userId, "employer_intake", [
    params.usage,
    params.replyUsage,
  ]);
  const usageRecord = usageRecords[0];

  const next: StoreData = {
    ...store,
    aiUsage: usageRecords.length
      ? [...(store.aiUsage ?? []), ...usageRecords].slice(-400)
      : store.aiUsage,
    employers: store.employers.map((e) => (e.userId === userId ? mirrored : e)),
  };
  return {
    store: next,
    reply,
    provider: params.provider,
    aiDegraded: params.aiDegraded,
    card,
    chat,
    pendingQuestions: [],
    jobId: active.id,
    newMessages,
    newFieldAnswers: [],
    usageRecord,
    usageRecords,
  };
}

export { applyCandidatePatch, applyJobPatch };
