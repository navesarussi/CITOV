import {
  appendAssistantReply,
  prepareEmployeeTurn,
  type ChatTurnResult,
} from "@/application/chat-turn";
import { getIdentityStaging } from "@/domain/candidate-profiles";
import {
  extractCvPersonName,
  firstNameFromFullName,
} from "@/domain/person-name";
import { cvIdentityMismatchWelcome } from "@/domain/agent-identity";
import type { StoreData } from "@/domain/types";
import type { Locale } from "@/i18n/types";
import { runCvWelcomeReply } from "@/infrastructure/ai/intake";

function accountFirstName(store: StoreData, userId: string): string | undefined {
  const name = store.users.find((u) => u.id === userId)?.name?.trim();
  return firstNameFromFullName(name ?? "");
}

function subjectFirstNameFromCard(store: StoreData, userId: string): string | undefined {
  const emp = store.employees.find((e) => e.userId === userId);
  if (!emp) return undefined;
  const staging = getIdentityStaging(emp);
  if (staging?.cvPersonName) return firstNameFromFullName(staging.cvPersonName);
  const fromCard = extractCvPersonName({
    summary: emp.card.summary,
    workHistory: emp.cv?.workHistory,
  });
  return fromCard ? firstNameFromFullName(fromCard) : undefined;
}

export async function runCvWelcomeAfterUpload(params: {
  store: StoreData;
  userId: string;
  locale: Locale;
  userCvMessage: string;
  isCvUpdate: boolean;
}): Promise<ChatTurnResult> {
  const emp = params.store.employees.find((e) => e.userId === params.userId);
  const staging = emp ? getIdentityStaging(emp) : undefined;

  if (staging) {
    const reply = cvIdentityMismatchWelcome({
      locale: params.locale,
      accountFirstName: accountFirstName(params.store, params.userId),
      cvPersonName: staging.cvPersonName,
      isCvUpdate: params.isCvUpdate,
    });
    return appendAssistantReply({
      store: params.store,
      userId: params.userId,
      reply,
      provider: "deterministic",
      aiDegraded: false,
    });
  }

  const prep = prepareEmployeeTurn(params.store, params.userId);
  const welcome = await runCvWelcomeReply({
    userCvMessage: params.userCvMessage,
    card: prep.card,
    chat: prep.chat,
    pendingQuestions: prep.pendingQuestions,
    systemPrompt: prep.systemPrompt,
    pendingConflicts: prep.pendingConflicts,
    pendingInferences: prep.pendingInferences,
    openReliabilityNotes: prep.openReliabilityNotes,
    isCvUpdate: params.isCvUpdate,
    locale: params.locale,
    accountHolderFirstName: accountFirstName(params.store, params.userId),
    candidateSubjectFirstName: subjectFirstNameFromCard(params.store, params.userId),
  });

  return appendAssistantReply({
    store: params.store,
    userId: params.userId,
    reply: welcome.reply,
    usage: welcome.usage,
    provider: welcome.provider,
    aiDegraded: welcome.degraded,
  });
}
