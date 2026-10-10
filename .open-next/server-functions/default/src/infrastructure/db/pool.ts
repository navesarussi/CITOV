import dns from "node:dns/promises";
import { Pool } from "pg";
import { parseDatabaseUrl, poolerConnectionCandidates } from "./connection-string";
import { appendPoolerQueryParams, poolUsesTransactionMode } from "./pool-config";
import { logDbTiming, startDbTimer } from "./db-timing";

declare global {
  // eslint-disable-next-line no-var
  var __shidukhPg: Pool | undefined;
  // eslint-disable-next-line no-var
  var __shidukhPgUrl: string | undefined;
}

function poolMax(): number {
  const raw = Number(process.env.DB_POOL_MAX ?? 12);
  if (!Number.isFinite(raw) || raw < 1) return 12;
  return Math.min(Math.floor(raw), 20);
}

async function hostResolves(connectionString: string): Promise<boolean> {
  try {
    const { host } = parseDatabaseUrl(connectionString);
    await dns.lookup(host);
    return true;
  } catch {
    return false;
  }
}

async function probeConnection(connectionString: string): Promise<string> {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 2000,
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
  const elapsed = startDbTimer();
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error("DATABASE_URL is not set");

  if (global.__shidukhPgUrl) {
    logDbTiming("resolveConnectionString cache-hit", elapsed());
    return global.__shidukhPgUrl;
  }

  let parsedHost = "";
  try {
    parsedHost = parseDatabaseUrl(raw).host;
  } catch {
    /* ignore */
  }

  const candidates = [...new Set(poolerConnectionCandidates(raw))];

  // DATABASE_URL already targets Supavisor — connect directly (no multi-region sweep).
  if (parsedHost.includes("pooler.supabase.com") && candidates.length === 1) {
    const hit = appendPoolerQueryParams(candidates[0]!);
    global.__shidukhPgUrl = hit;
    logDbTiming("resolveConnectionString pooler-direct", elapsed(), { host: parsedHost });
    return hit;
  }

  const preferred = candidates[0];
  if (preferred) {
    try {
      if (await hostResolves(preferred)) {
        const hit = appendPoolerQueryParams(await probeConnection(preferred));
        global.__shidukhPgUrl = hit;
        logDbTiming("resolveConnectionString probe-ok", elapsed(), { tried: 1 });
        return hit;
      }
    } catch {
      // fall through
    }
  }

  const toTry = candidates.length <= 6 ? candidates : candidates.slice(0, 6);
  let lastError = "unknown";
  for (const c of toTry) {
    try {
      if (!(await hostResolves(c))) continue;
      const hit = appendPoolerQueryParams(await probeConnection(c));
      global.__shidukhPgUrl = hit;
      logDbTiming("resolveConnectionString probe-ok", elapsed(), { tried: toTry.indexOf(c) + 1 });
      return hit;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`Could not connect to Supabase via pooler (${toTry.length} tried): ${lastError}`);
}

export function getResolvedDatabaseHost(): string | null {
  const url = global.__shidukhPgUrl;
  if (!url) return null;
  try {
    return parseDatabaseUrl(url).host;
  } catch {
    return null;
  }
}

export async function getPool(): Promise<Pool> {
  if (!global.__shidukhPg) {
    const elapsed = startDbTimer();
    const connectionString = await resolveConnectionString();
    global.__shidukhPgUrl = connectionString;
    const txPool = poolUsesTransactionMode(connectionString);
    global.__shidukhPg = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: poolMax(),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      allowExitOnIdle: true,
      ...(txPool ? { maxUses: 7500 } : {}),
    });
    logDbTiming("getPool init", elapsed(), { txPool, max: poolMax() });
  }
  return global.__shidukhPg;
}
