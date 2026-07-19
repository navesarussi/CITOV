import { Pool } from "pg";
import type { StoreData } from "@/domain/types";
import {
  emptyCandidateCard,
  emptyJobCard,
  normalizeCandidateCard,
  normalizeJobCard,
} from "@/domain/types";

declare global {
  // eslint-disable-next-line no-var
  var __shidukhPg: Pool | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!global.__shidukhPg) {
    global.__shidukhPg = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return global.__shidukhPg;
}

function normalizeStore(raw: StoreData): StoreData {
  return {
    ...raw,
    employees: (raw.employees ?? []).map((e) => ({
      ...e,
      card: normalizeCandidateCard(e.card),
      pendingFieldQuestionIds: e.pendingFieldQuestionIds ?? [],
      chat: e.chat ?? [],
    })),
    employers: (raw.employers ?? []).map((e) => ({
      ...e,
      card: normalizeJobCard(e.card),
      chat: e.chat ?? [],
    })),
    users: raw.users ?? [],
    fieldQuestions: raw.fieldQuestions ?? [],
    fieldAnswers: raw.fieldAnswers ?? [],
    matches: raw.matches ?? [],
  };
}

function seedStore(): StoreData {
  const now = new Date().toISOString();
  const empId = "demo-employee";
  const bossId = "demo-employer";
  return {
    users: [
      { id: empId, name: "נועה (דמו עובדת)", role: "employee", createdAt: now },
      { id: bossId, name: "דני (דמו מעסיק)", role: "employer", createdAt: now },
    ],
    employees: [
      {
        userId: empId,
        card: emptyCandidateCard(),
        chat: [],
        pendingFieldQuestionIds: [],
      },
    ],
    employers: [
      {
        userId: bossId,
        card: emptyJobCard(),
        chat: [],
      },
    ],
    fieldQuestions: [],
    fieldAnswers: [],
    matches: [],
  };
}

async function ensureSchema(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    create table if not exists app_store (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    );
  `);
}

export async function readStore(): Promise<StoreData> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<{ data: StoreData }>(
    `select data from app_store where id = 'main' limit 1`,
  );
  if (result.rows[0]?.data) {
    return normalizeStore(result.rows[0].data);
  }
  const seeded = seedStore();
  await writeStore(seeded);
  return seeded;
}

export async function writeStore(store: StoreData): Promise<void> {
  await ensureSchema();
  const pool = getPool();
  await pool.query(
    `
    insert into app_store (id, data, updated_at)
    values ('main', $1::jsonb, now())
    on conflict (id) do update
      set data = excluded.data,
          updated_at = now()
    `,
    [JSON.stringify(store)],
  );
}

export async function updateStore(
  updater: (store: StoreData) => StoreData,
): Promise<StoreData> {
  const current = await readStore();
  const next = updater(current);
  await writeStore(next);
  return next;
}
