import { ok } from "@/infrastructure/http";
import { getSupabaseConfig } from "@/infrastructure/supabase/client";
import { deriveSupabaseUrlFromDatabaseUrl } from "@/infrastructure/supabase/derive-url";
import { parseDatabaseUrl, poolerConnectionCandidates } from "@/infrastructure/db/connection-string";
import { getPool, getResolvedDatabaseHost } from "@/infrastructure/db/pool";
import { logDbTiming, startDbTimer } from "@/infrastructure/db/db-timing";

function databaseDiagnostics() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return { hasDatabaseUrl: false };
  try {
    const parsed = parseDatabaseUrl(raw);
    return {
      hasDatabaseUrl: true,
      host: parsed.host,
      user: parsed.user,
      passwordLength: parsed.password.length,
      ref: parsed.ref,
      candidateCount: poolerConnectionCandidates(raw).length,
    };
  } catch {
    return { hasDatabaseUrl: true, parseError: true };
  }
}

export async function GET() {
  const diagnostics = databaseDiagnostics();
  const elapsed = startDbTimer();
  try {
    const supabase = getSupabaseConfig();
    const derivedUrl = deriveSupabaseUrlFromDatabaseUrl(process.env.DATABASE_URL);
    const pool = await getPool();
    const result = await pool.query<{ now: Date }>(`select now()`);
    logDbTiming("health/db", elapsed(), { host: getResolvedDatabaseHost() });
    return ok({
      postgres: true,
      timestamp: result.rows[0]?.now,
      supabase: Boolean(supabase),
      supabaseUrl: supabase?.url ?? derivedUrl,
      diagnostics: {
        ...diagnostics,
        resolvedHost: getResolvedDatabaseHost(),
        timingMs: Math.round(elapsed()),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return ok({ error: message, postgres: false, diagnostics }, { status: 500 });
  }
}
