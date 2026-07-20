import { Pool } from "pg";
import { poolerConnectionCandidates } from "./connection-string";

declare global {
  var __shidukhPg: Pool | undefined;
  var __shidukhPgResolving: Promise<Pool> | undefined;
}

async function probeConnection(connectionString: string): Promise<string> {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 3000,
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
  // Race small batches — first success wins (keeps cold start snappy).
  const batchSize = 4;
  let lastError = "unknown";
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map((c) => probeConnection(c)));
    const hit = results.find((r) => r.status === "fulfilled");
    if (hit && hit.status === "fulfilled") return hit.value;
    for (const r of results) {
      if (r.status === "rejected") {
        lastError = r.reason instanceof Error ? r.reason.message : String(r.reason);
      }
    }
  }
  throw new Error(
    `Could not connect to Postgres (${candidates.length} tried): ${lastError}`,
  );
}

export async function getPool(): Promise<Pool> {
  if (global.__shidukhPg) return global.__shidukhPg;
  if (!global.__shidukhPgResolving) {
    global.__shidukhPgResolving = (async () => {
      const connectionString = await resolveConnectionString();
      global.__shidukhPg = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 5,
        connectionTimeoutMillis: 8000,
        idleTimeoutMillis: 20_000,
      });
      return global.__shidukhPg;
    })();
  }
  try {
    return await global.__shidukhPgResolving;
  } catch (e) {
    global.__shidukhPgResolving = undefined;
    throw e;
  }
}
