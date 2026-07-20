import { Pool } from "pg";
import { poolerConnectionCandidates } from "./connection-string";

declare global {
  // eslint-disable-next-line no-var
  var __shidukhPg: Pool | undefined;
}

async function probeConnection(connectionString: string): Promise<string> {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 3500,
  });
  try {
    const client = await pool.connect();
    await client.query("select 1");
    client.release();
    return connectionString;
  } finally {
    await pool.end();
  }
}

async function resolveConnectionString(): Promise<string> {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error("DATABASE_URL is not set");

  const candidates = poolerConnectionCandidates(raw);
  const batchSize = 8;
  let lastError = "unknown";
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map((c) => probeConnection(c)));
    const hit = results.find((r) => r.status === "fulfilled");
    if (hit && hit.status === "fulfilled") return hit.value;
    const last = results.findLast((r) => r.status === "rejected");
    if (last && last.status === "rejected") {
      lastError = last.reason instanceof Error ? last.reason.message : String(last.reason);
    }
  }
  throw new Error(`Could not connect to Supabase via pooler (${candidates.length} tried): ${lastError}`);
}

export async function getPool(): Promise<Pool> {
  if (!global.__shidukhPg) {
    const connectionString = await resolveConnectionString();
    global.__shidukhPg = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
      connectionTimeoutMillis: 10000,
    });
  }
  return global.__shidukhPg;
}
