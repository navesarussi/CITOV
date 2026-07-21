import type { PoolClient } from "pg";
import type {
  AiUsageRecord,
  CandidateCard,
  ChatMessage,
  FieldAnswer,
  JobCard,
  JobSlot,
} from "@/domain/types";
import type { ChatConversationContext } from "./chat-messages";
import { ensureSchema } from "./schema";
import { getPool } from "./pool";

/**
 * Scoped writes: each interactive action (a chat turn, a flexibility change)
 * touches ONLY the acting user's rows via targeted UPDATE/INSERT, instead of the
 * whole-store delete-and-reinsert in `persistStore`. Matches stay off this path
 * and are refreshed separately (deferred) via `replaceMatches`.
 */

async function withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const pool = await getPool();
  const client = await pool.connect();
  let began = false;
  try {
    await client.query("begin");
    began = true;
    const result = await fn(client);
    await client.query("commit");
    began = false;
    return result;
  } catch (e) {
    if (began) await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

async function insertChatMessages(
  client: PoolClient,
  ownerUserId: string,
  context: ChatConversationContext,
  jobId: string | null,
  messages: ChatMessage[],
): Promise<void> {
  for (const m of messages) {
    await client.query(
      `insert into chat_messages
         (id, owner_user_id, conversation_context, job_id, role, content, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do nothing`,
      [m.id, ownerUserId, context, jobId, m.role, m.content, m.createdAt],
    );
  }
}

async function updateEmployeeProfile(
  client: PoolClient,
  userId: string,
  card: CandidateCard,
  pendingFieldQuestionIds: string[],
): Promise<void> {
  await client.query(
    `insert into employee_profiles (user_id, card, pending_field_question_ids, updated_at)
     values ($1, $2::jsonb, $3::jsonb, now())
     on conflict (user_id) do update set
       card = excluded.card,
       pending_field_question_ids = excluded.pending_field_question_ids,
       updated_at = excluded.updated_at`,
    [userId, JSON.stringify(card), JSON.stringify(pendingFieldQuestionIds)],
  );
}

async function updateEmployerProfile(
  client: PoolClient,
  userId: string,
  card: JobCard,
  jobs: JobSlot[],
  activeJobId: string,
): Promise<void> {
  await client.query(
    `insert into employer_profiles (user_id, card, jobs, active_job_id, updated_at)
     values ($1, $2::jsonb, $3::jsonb, $4, now())
     on conflict (user_id) do update set
       card = excluded.card,
       jobs = excluded.jobs,
       active_job_id = excluded.active_job_id,
       updated_at = excluded.updated_at`,
    [userId, JSON.stringify(card), JSON.stringify(jobs), activeJobId],
  );
}

async function insertAiUsage(client: PoolClient, record: AiUsageRecord): Promise<void> {
  await client.query(
    `insert into ai_usage
       (id, type, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, created_at)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do nothing`,
    [
      record.id,
      record.type,
      record.promptTokens,
      record.completionTokens,
      record.totalTokens,
      record.estimatedCostUsd,
      record.createdAt,
    ],
  );
}

async function upsertFieldAnswers(client: PoolClient, answers: FieldAnswer[]): Promise<void> {
  for (const a of answers) {
    await client.query(
      `insert into field_answers (question_id, candidate_id, answer, answered_at)
       values ($1, $2, $3, $4)
       on conflict (question_id, candidate_id) do update set
         answer = excluded.answer,
         answered_at = excluded.answered_at`,
      [a.questionId, a.candidateId, a.answer, a.answeredAt],
    );
  }
}

/** Persist a candidate chat turn (profile card + new messages + answers + usage). */
export async function persistEmployeeTurn(params: {
  userId: string;
  card: CandidateCard;
  pendingFieldQuestionIds: string[];
  newMessages: ChatMessage[];
  newFieldAnswers: FieldAnswer[];
  usageRecord?: AiUsageRecord;
}): Promise<void> {
  await withTx(async (client) => {
    await updateEmployeeProfile(
      client,
      params.userId,
      params.card,
      params.pendingFieldQuestionIds,
    );
    await insertChatMessages(client, params.userId, "employee", null, params.newMessages);
    if (params.newFieldAnswers.length) {
      await upsertFieldAnswers(client, params.newFieldAnswers);
    }
    if (params.usageRecord) await insertAiUsage(client, params.usageRecord);
  });
}

/** Persist an employer chat turn (jobs blob + active job + new messages + usage). */
export async function persistEmployerTurn(params: {
  userId: string;
  card: JobCard;
  jobs: JobSlot[];
  activeJobId: string;
  jobId: string;
  newMessages: ChatMessage[];
  usageRecord?: AiUsageRecord;
}): Promise<void> {
  await withTx(async (client) => {
    await updateEmployerProfile(
      client,
      params.userId,
      params.card,
      params.jobs,
      params.activeJobId,
    );
    await insertChatMessages(client, params.userId, "employer", params.jobId, params.newMessages);
    if (params.usageRecord) await insertAiUsage(client, params.usageRecord);
  });
}

/** Persist just the candidate profile card (e.g. a flexibility change). */
export async function persistEmployeeCard(
  userId: string,
  card: CandidateCard,
  pendingFieldQuestionIds: string[],
): Promise<void> {
  await withTx((client) => updateEmployeeProfile(client, userId, card, pendingFieldQuestionIds));
}

/** Persist just the employer profile (e.g. a flexibility change). */
export async function persistEmployerCard(
  userId: string,
  card: JobCard,
  jobs: JobSlot[],
  activeJobId: string,
): Promise<void> {
  await withTx((client) => updateEmployerProfile(client, userId, card, jobs, activeJobId));
}
