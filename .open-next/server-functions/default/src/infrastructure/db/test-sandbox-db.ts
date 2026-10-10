import { TEST_SANDBOX_DATASET_ID } from "@/domain/test-sandbox";
import type { Match, StoreData, User } from "@/domain/types";
import type { PoolClient } from "pg";
import { ensureSchema } from "./schema";
import { getPool } from "./pool";
import { shouldUseMemoryStore } from "./memory-store";
import { readMemoryStore, writeMemoryStore } from "./memory-store";

export async function deleteTestDataset(datasetId = TEST_SANDBOX_DATASET_ID): Promise<void> {
  if (shouldUseMemoryStore()) {
    const all = readMemoryStore();
    const keepUsers = all.users.filter((u) => u.datasetId !== datasetId && !u.isTest);
    const ids = new Set(keepUsers.map((u) => u.id));
    writeMemoryStore({
      ...all,
      users: keepUsers,
      employees: all.employees.filter((e) => ids.has(e.userId)),
      employers: all.employers.filter((e) => ids.has(e.userId)),
      matches: all.matches.filter((m) => m.datasetId !== datasetId && !m.isTest),
    });
    return;
  }
  await ensureSchema();
  const pool = await getPool();
  await pool.query(`delete from matches where dataset_id = $1`, [datasetId]);
  await pool.query(
    `delete from employee_profiles where user_id in (select id from app_users where dataset_id = $1)`,
    [datasetId],
  );
  await pool.query(
    `delete from employer_profiles where user_id in (select id from app_users where dataset_id = $1)`,
    [datasetId],
  );
  await pool.query(`delete from app_users where dataset_id = $1`, [datasetId]);
}

async function upsertSandboxUser(client: PoolClient, user: User): Promise<void> {
  await client.query(
    `insert into app_users (id, name, role, email, created_at, is_test, dataset_id)
     values ($1,$2,$3,$4,$5,true,$6)
     on conflict (id) do update set
       name = excluded.name,
       role = excluded.role,
       email = excluded.email,
       is_test = true,
       dataset_id = excluded.dataset_id`,
    [user.id, user.name, user.role, user.email ?? null, user.createdAt, user.datasetId],
  );
}

export async function persistTestSandboxStore(store: StoreData): Promise<void> {
  if (shouldUseMemoryStore()) {
    const all = readMemoryStore();
    const mergedUsers = [...all.users.filter((u) => !u.isTest), ...store.users];
    writeMemoryStore({
      ...all,
      users: mergedUsers,
      employees: [...all.employees.filter((e) => !e.userId.startsWith("sandbox-")), ...store.employees],
      employers: [...all.employers.filter((e) => !e.userId.startsWith("sandbox-")), ...store.employers],
      matches: [...all.matches.filter((m) => !m.isTest), ...store.matches],
    });
    return;
  }
  await ensureSchema();
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const u of store.users) {
      await upsertSandboxUser(client, u);
    }
    for (const e of store.employees) {
      await client.query(
        `insert into employee_profiles (user_id, card, pending_field_question_ids, updated_at)
         values ($1,$2::jsonb,$3::jsonb, now())
         on conflict (user_id) do update set card = excluded.card`,
        [e.userId, JSON.stringify(e.card), JSON.stringify(e.pendingFieldQuestionIds ?? [])],
      );
    }
    for (const er of store.employers) {
      await client.query(
        `insert into employer_profiles (user_id, card, jobs, active_job_id, updated_at)
         values ($1,$2::jsonb,$3::jsonb,$4, now())
         on conflict (user_id) do update set card = excluded.card, jobs = excluded.jobs, active_job_id = excluded.active_job_id`,
        [er.userId, JSON.stringify(er.card), JSON.stringify(er.jobs), er.activeJobId],
      );
    }
    await client.query(`delete from matches where dataset_id = $1`, [TEST_SANDBOX_DATASET_ID]);
    for (const m of store.matches) {
      await client.query(
        `insert into matches (id, job_owner_id, job_id, candidate_id, score, reason, score_breakdown, is_test, dataset_id, status, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb,true,$8,$9,$10,$11)`,
        [
          m.id,
          m.jobOwnerId,
          m.jobId,
          m.candidateId,
          m.score,
          m.reason,
          m.scoreBreakdown ? JSON.stringify(m.scoreBreakdown) : null,
          m.datasetId ?? TEST_SANDBOX_DATASET_ID,
          m.status,
          m.createdAt,
          m.updatedAt,
        ],
      );
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function readTestSandboxStore(): Promise<StoreData> {
  const { readNormalizedStore } = await import("./normalized-store");
  const { filterStoreByScope } = await import("./store-scope");
  const all = await readNormalizedStore();
  return filterStoreByScope(all, "test");
}
