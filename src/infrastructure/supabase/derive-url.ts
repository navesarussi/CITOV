import { parseDatabaseUrl } from "@/infrastructure/db/connection-string";

/** Derive Supabase project URL from a Postgres connection string (server-only). */
export function deriveSupabaseUrlFromDatabaseUrl(databaseUrl?: string): string | null {
  const raw = databaseUrl?.trim();
  if (!raw) return null;
  try {
    const parsed = parseDatabaseUrl(raw);
    if (parsed.ref) return `https://${parsed.ref}.supabase.co`;
    const fromHost = parsed.host.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
    return fromHost ? `https://${fromHost}.supabase.co` : null;
  } catch {
    return null;
  }
}
