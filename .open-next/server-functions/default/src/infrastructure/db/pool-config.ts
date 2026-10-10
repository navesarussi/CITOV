import { parseDatabaseUrl } from "./connection-string";

/** Transaction pooler (port 6543) does not support prepared statements. */
export function appendPoolerQueryParams(connectionString: string): string {
  const trimmed = connectionString.trim();
  if (trimmed.includes("pgbouncer=true")) return trimmed;
  try {
    const { port, host } = parseDatabaseUrl(trimmed);
    const usePgbouncer =
      port === "6543" || (host.includes("pooler.supabase.com") && port !== "5432");
    if (!usePgbouncer) return trimmed;
    const sep = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${sep}pgbouncer=true`;
  } catch {
    return trimmed;
  }
}

export function poolUsesTransactionMode(connectionString: string): boolean {
  return connectionString.includes("pgbouncer=true") || connectionString.includes(":6543");
}
