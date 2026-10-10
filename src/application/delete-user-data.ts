import { NotFoundError } from "@/domain/errors";
import { isNonProductionUserId } from "@/domain/test-sandbox";
import { shouldUseMemoryStore } from "@/infrastructure/db/memory-store";
import { readMemoryStore, writeMemoryStore } from "@/infrastructure/db/memory-store";
import { purgeMemoryEmbeddingsForUser } from "@/infrastructure/db/card-embeddings-memory";
import { ensureSchema } from "@/infrastructure/db/schema";
import { getPool } from "@/infrastructure/db/pool";
import { deleteCandidateDocumentBlobs } from "@/infrastructure/files/cv-storage";

function employerJobIdsFromJson(jobs: unknown): string[] {
  if (!Array.isArray(jobs)) return [];
  return jobs
    .map((j) => (j && typeof j === "object" && "id" in j ? String((j as { id: unknown }).id) : ""))
    .filter(Boolean);
}

export async function deleteUserAccountData(userId: string): Promise<void> {
  if (isNonProductionUserId(userId)) {
    throw new NotFoundError("User");
  }
  if (shouldUseMemoryStore()) {
    const all = readMemoryStore();
    const emp = all.employees.find((e) => e.userId === userId);
    const boss = all.employers.find((e) => e.userId === userId);
    const storageKeys = (emp?.cv?.documents ?? []).map((d) => d.storageKey).filter(Boolean);
    const jobIds = boss?.jobs?.map((j) => j.id) ?? [];
    purgeMemoryEmbeddingsForUser(userId, jobIds);
    await deleteCandidateDocumentBlobs(storageKeys);
    writeMemoryStore({
      ...all,
      users: all.users.filter((u) => u.id !== userId),
      employees: all.employees.filter((e) => e.userId !== userId),
      employers: all.employers.filter((e) => e.userId !== userId),
      matches: all.matches.filter(
        (m) => m.candidateId !== userId && m.jobOwnerId !== userId,
      ),
      fieldQuestions: all.fieldQuestions.filter((q) => q.sourceEmployerId !== userId),
      fieldAnswers: all.fieldAnswers.filter((a) => a.candidateId !== userId),
      aiUsage: (all.aiUsage ?? []).filter((u) => u.userId !== userId),
    });
    return;
  }
  await ensureSchema();
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");

    const userRow = await client.query<{ role: string }>(
      `select role from app_users where id = $1 and coalesce(is_test, false) = false for update`,
      [userId],
    );
    if (!userRow.rows[0]) {
      await client.query("rollback");
      throw new NotFoundError("User");
    }

    const cvRow = await client.query<{ cv: { documents?: { storageKey?: string }[] } | null }>(
      `select cv from employee_profiles where user_id = $1`,
      [userId],
    );
    const storageKeys = (cvRow.rows[0]?.cv?.documents ?? [])
      .map((d) => d.storageKey)
      .filter((k): k is string => typeof k === "string" && k.length > 0);

    const jobRows = await client.query<{ jobs: unknown }>(
      `select jobs from employer_profiles where user_id = $1`,
      [userId],
    );
    const jobIds = employerJobIdsFromJson(jobRows.rows[0]?.jobs);

    await client.query(
      `delete from card_embedding_segments
       where (owner_kind = 'candidate' and owner_id = $1)
          or (owner_kind = 'job' and owner_id = $1)`,
      [userId],
    );

    await client.query(`delete from degraded_turns where user_id = $1`, [userId]);
    await client.query(`delete from field_questions where source_employer_id = $1`, [userId]);

    if (jobIds.length > 0) {
      await client.query(
        `delete from match_labels where candidate_id = $1 or labeler_user_id = $1 or job_id = any($2::text[])`,
        [userId, jobIds],
      );
      await client.query(
        `delete from sandbox_llm_judgments where candidate_id = $1 or job_id = any($2::text[])`,
        [userId, jobIds],
      );
      await client.query(
        `delete from card_embedding_segments
         where (owner_kind = 'candidate' and owner_id = $1)
            or (owner_kind = 'job' and (owner_id = $1 or owner_id = any($2::text[])))`,
        [userId, jobIds],
      );
    } else {
      await client.query(
        `delete from match_labels where candidate_id = $1 or labeler_user_id = $1`,
        [userId],
      );
      await client.query(`delete from sandbox_llm_judgments where candidate_id = $1`, [userId]);
      await client.query(
        `delete from card_embedding_segments where owner_kind = 'candidate' and owner_id = $1`,
        [userId],
      );
    }

    await client.query(`delete from user_rate_limit_windows where user_id = $1`, [userId]);
    await client.query(`delete from ai_usage where user_id = $1`, [userId]);

    await client.query(
      `update app_events
       set user_id = null, user_email = null,
           meta = case when meta is null then null else meta - 'userId' end
       where user_id = $1`,
      [userId],
    );

    const del = await client.query(
      `delete from app_users where id = $1 and coalesce(is_test, false) = false`,
      [userId],
    );
    if ((del.rowCount ?? 0) === 0) {
      await client.query("rollback");
      throw new NotFoundError("User");
    }

    await client.query("commit");
    await deleteCandidateDocumentBlobs(storageKeys);
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
