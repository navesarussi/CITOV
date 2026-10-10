import {
  applyEmployeeRecoveryTurn,
  applyEmployerRecoveryTurn,
  prepareEmployeeTurn,
  prepareEmployerTurn,
} from "@/application/chat-turn";
import { isForceGeminiFailure, hasGeminiKey } from "@/infrastructure/ai/gemini-client";
import { runEmployeeIntake, runEmployerIntake } from "@/infrastructure/ai/intake";
import {
  listPendingDegradedTurns,
  markDegradedTurn,
  type DegradedTurnRow,
} from "@/infrastructure/db/degraded-turns";
import { recordAppEventSafe } from "@/infrastructure/db/app-events";
import { readStore } from "@/infrastructure/store";
import { persistEmployeeTurn, persistEmployerTurn } from "@/infrastructure/db/scoped-store";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import type { CandidateCard } from "@/domain/types";

export type RecoveryRunSummary = {
  attempted: number;
  recovered: number;
  failed: number;
};

async function recoverOne(row: DegradedTurnRow): Promise<boolean> {
  const store = await readStore();
  if (row.role === "employee") {
    const prep = await prepareEmployeeTurn(store, row.userId);
    const intake = await runEmployeeIntake({
      message: row.userMessage,
      card: prep.card,
      chat: prep.chat,
      pendingQuestions: prep.pendingQuestions,
      systemPrompt: prep.systemPrompt,
      pendingConflicts: prep.pendingConflicts,
      pendingInferences: prep.pendingInferences,
      openReliabilityNotes: prep.openReliabilityNotes,
    });
    if (intake.degraded || intake.provider === "heuristic") return false;
    const result = applyEmployeeRecoveryTurn({
      store,
      userId: row.userId,
      message: row.userMessage,
      reply: intake.reply,
      candidatePatch: intake.candidatePatch,
      fieldAnswers: intake.fieldAnswers,
      usage: intake.usage,
      provider: intake.provider,
    });
    const emp = result.store.employees.find((e) => e.userId === row.userId);
    await persistEmployeeTurn({
      store: result.store,
      userId: row.userId,
      card: result.card as CandidateCard,
      pendingFieldQuestionIds: emp?.pendingFieldQuestionIds ?? [],
      cv: result.cv,
      newMessages: result.newMessages,
      newFieldAnswers: result.newFieldAnswers,
      usageRecord: result.usageRecord,
      usageRecords: result.usageRecords,
    });
    return true;
  }
  const prep = await prepareEmployerTurn(store, row.userId, row.jobId ?? undefined);
  const intake = await runEmployerIntake({
    message: row.userMessage,
    card: prep.card,
    chat: prep.chat,
    systemPrompt: prep.systemPrompt,
    pendingJobConfirmations: prep.pendingJobConfirmations,
  });
  if (intake.degraded || intake.provider === "heuristic") return false;
  const result = applyEmployerRecoveryTurn({
    store,
    userId: row.userId,
    message: row.userMessage,
    reply: intake.reply,
    jobPatch: intake.jobPatch,
    usage: intake.usage,
    provider: intake.provider,
    jobId: prep.jobId,
  });
  const raw = result.store.employers.find((e) => e.userId === row.userId);
  if (!raw) return false;
  const employer = normalizeEmployerRecord(raw);
  await persistEmployerTurn({
    store: result.store,
    userId: row.userId,
    card: employer.card,
    jobs: employer.jobs,
    activeJobId: employer.activeJobId,
    jobId: result.jobId ?? employer.activeJobId,
    newMessages: result.newMessages,
    usageRecord: result.usageRecord,
    usageRecords: result.usageRecords,
  });
  return true;
}

export async function runDegradedTurnRecovery(limit = 10): Promise<RecoveryRunSummary> {
  if (!hasGeminiKey() || isForceGeminiFailure()) {
    return { attempted: 0, recovered: 0, failed: 0 };
  }
  const pending = await listPendingDegradedTurns(limit);
  let recovered = 0;
  let failed = 0;
  for (const row of pending) {
    try {
      const ok = await recoverOne(row);
      if (ok) {
        await markDegradedTurn(row.id, "recovered");
        recovered += 1;
        recordAppEventSafe({
          kind: "degraded_turn_recovered",
          severity: "info",
          message: `Recovered degraded ${row.role} turn for ${row.userId}`,
          meta: { turnId: row.id },
        });
      } else {
        failed += 1;
      }
    } catch (e) {
      failed += 1;
      await markDegradedTurn(row.id, "failed");
      recordAppEventSafe({
        kind: "degraded_turn_recovery_failed",
        severity: "warn",
        message: e instanceof Error ? e.message : String(e),
        meta: { turnId: row.id },
      });
    }
  }
  return { attempted: pending.length, recovered, failed };
}
