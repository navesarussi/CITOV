import { ok } from "@/infrastructure/http";
import { assertAdmin } from "@/infrastructure/admin-guard";
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

/** Public: `{ ok }`. Admin `?detail=1`: Postgres / Supabase diagnostics (no secrets). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const detail = url.searchParams.get("detail") === "1";
  const adminGate = detail ? await assertAdmin() : { ok: false as const };

  const elapsed = startDbTimer();
  try {
    const pool = await getPool();
    await pool.query<{ now: Date }>(`select now()`);
    logDbTiming("health/db", elapsed(), { host: getResolvedDatabaseHost() });
    if (adminGate.ok) {
      const supabase = getSupabaseConfig();
      const derivedUrl = deriveSupabaseUrlFromDatabaseUrl(process.env.DATABASE_URL);
      return ok({
        ok: true,
        postgres: true,
        supabase: Boolean(supabase),
        supabaseUrl: supabase?.url ?? derivedUrl,
        diagnostics: {
          ...databaseDiagnostics(),
          resolvedHost: getResolvedDatabaseHost(),
          timingMs: Math.round(elapsed()),
        },
      });
    }
    return ok({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (adminGate.ok) {
      return ok(
        { ok: false, error: message, postgres: false, diagnostics: databaseDiagnostics() },
        { status: 500 },
      );
    }
    return ok({ ok: false }, { status: 500 });
  }
}
