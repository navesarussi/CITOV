const DEFAULT_REGIONS = ["us-east-1", "eu-central-1", "eu-west-1"] as const;
const DEFAULT_CLUSTERS = ["aws-0", "aws-1"] as const;

export type ParsedDbUrl = {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
  ref: string | null;
};

/** Parse postgres URLs even when the password contains reserved characters. */
export function parseDatabaseUrl(raw: string): ParsedDbUrl {
  const trimmed = raw.trim();
  const prefix = trimmed.match(/^(postgres(?:ql)?:\/\/)/i)?.[1];
  if (!prefix) throw new Error("Invalid DATABASE_URL scheme");
  const rest = trimmed.slice(prefix.length);
  const at = rest.lastIndexOf("@");
  if (at < 0) throw new Error("Invalid DATABASE_URL credentials");
  const creds = rest.slice(0, at);
  const hostPart = rest.slice(at + 1);
  const colon = creds.indexOf(":");
  if (colon < 0) throw new Error("Invalid DATABASE_URL user");
  const user = decodeURIComponent(creds.slice(0, colon));
  const password = decodeURIComponent(creds.slice(colon + 1));
  const [hostPort, dbPath = "postgres"] = hostPart.split("/");
  const [host, port = "5432"] = hostPort.split(":");
  const database = dbPath.split("?")[0] || "postgres";
  const ref =
    host.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ??
    user.match(/^postgres\.(.+)$/)?.[1] ??
    null;
  return { user, password, host, port, database, ref };
}

export function buildDatabaseUrl(parts: {
  user: string;
  password: string;
  host: string;
  port: number | string;
  database: string;
}): string {
  const user = encodeURIComponent(parts.user);
  const password = encodeURIComponent(parts.password);
  return `postgresql://${user}:${password}@${parts.host}:${parts.port}/${parts.database}`;
}

/** Rewrite direct `db.*.supabase.co` URLs to IPv4-compatible Supavisor pooler. */
export function toPoolerConnectionString(
  connectionString: string,
  region = process.env.SUPABASE_POOLER_REGION?.trim(),
  cluster = process.env.SUPABASE_POOLER_CLUSTER?.trim() || "aws-0",
): string {
  try {
    const parsed = parseDatabaseUrl(connectionString);
    if (!parsed.ref || parsed.user.startsWith("postgres.")) return connectionString;
    return buildDatabaseUrl({
      user: `postgres.${parsed.ref}`,
      password: parsed.password,
      host: `${cluster}-${region || "us-east-1"}.pooler.supabase.com`,
      port: 6543,
      database: parsed.database,
    });
  } catch {
    return connectionString;
  }
}

/**
 * Compact candidate list for cold starts.
 * Original URL first, then a few pooler hosts (not 100+).
 */
export function poolerConnectionCandidates(connectionString: string): string[] {
  try {
    const parsed = parseDatabaseUrl(connectionString);
    if (!parsed.ref || parsed.host.includes("pooler.supabase.com")) {
      return [connectionString];
    }

    const clusters = process.env.SUPABASE_POOLER_CLUSTER?.trim()
      ? [process.env.SUPABASE_POOLER_CLUSTER.trim()]
      : [...DEFAULT_CLUSTERS];
    const preferred = process.env.SUPABASE_POOLER_REGION?.trim();
    const regions = preferred
      ? [preferred, ...DEFAULT_REGIONS.filter((r) => r !== preferred)]
      : [...DEFAULT_REGIONS];

    const out = [connectionString];
    for (const cluster of clusters) {
      for (const region of regions) {
        out.push(
          buildDatabaseUrl({
            user: `postgres.${parsed.ref}`,
            password: parsed.password,
            host: `${cluster}-${region}.pooler.supabase.com`,
            port: 6543,
            database: parsed.database,
          }),
        );
      }
    }
    return out;
  } catch {
    return [connectionString];
  }
}

export function poolerConnectionForRegion(connectionString: string, region: string): string {
  return toPoolerConnectionString(connectionString, region);
}
