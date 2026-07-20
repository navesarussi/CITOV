import { ok } from "@/infrastructure/http";
import { getSupabaseConfig } from "@/infrastructure/supabase/client";
import { deriveSupabaseUrlFromDatabaseUrl } from "@/infrastructure/supabase/derive-url";
import { parseDatabaseUrl, poolerConnectionCandidates } from "@/infrastructure/db/connection-string";
import { ensureSchema } from "@/infrastructure/db/schema";
import { getPool } from "@/infrastructure/db/pool";

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
  try {
    const supabase = getSupabaseConfig();
    const derivedUrl = deriveSupabaseUrlFromDatabaseUrl(process.env.DATABASE_URL);
    await ensureSchema();
    const pool = await getPool();
    const result = await pool.query<{ now: Date }>(`select now()`);
    return ok({
      postgres: true,
      timestamp: result.rows[0]?.now,
      supabase: Boolean(supabase),
      supabaseUrl: supabase?.url ?? derivedUrl,
      diagnostics,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return ok({ error: message, postgres: false, diagnostics }, { status: 500 });
  }
}
