/** Derive Supabase project URL from a Postgres connection string (server-only). */
export function deriveSupabaseUrlFromDatabaseUrl(databaseUrl?: string): string | null {
  const raw = databaseUrl?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const fromUser = parsed.username.match(/^postgres\.(.+)$/)?.[1];
    const fromHost =
      parsed.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ??
      parsed.hostname.match(/^([^.]+)\.supabase\.co$/)?.[1];
    const ref = fromUser ?? fromHost;
    return ref ? `https://${ref}.supabase.co` : null;
  } catch {
    return null;
  }
}
