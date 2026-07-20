/** Known-good for this Supabase project (from prod `/api/health/db` resolvedHost). */
const DEFAULT_POOLER_REGION = "ap-south-1";
const DEFAULT_POOLER_CLUSTER = "aws-1";

const POOLER_REGIONS = [
  "ap-south-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "eu-west-1",
  "eu-central-1",
  "eu-north-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ca-central-1",
  "sa-east-1",
] as const;

const POOLER_CLUSTERS = ["aws-1", "aws-0", "aws-2", "aws-3"] as const;
const POOLER_PORTS = [6543, 5432] as const;

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
  region = process.env.SUPABASE_POOLER_REGION?.trim() || DEFAULT_POOLER_REGION,
  cluster = process.env.SUPABASE_POOLER_CLUSTER?.trim() || DEFAULT_POOLER_CLUSTER,
): string {
  try {
    const parsed = parseDatabaseUrl(connectionString);
    if (!parsed.ref || parsed.user.startsWith("postgres.")) return connectionString;
    return buildDatabaseUrl({
      user: `postgres.${parsed.ref}`,
      password: parsed.password,
      host: `${cluster}-${region}.pooler.supabase.com`,
      port: 6543,
      database: parsed.database,
    });
  } catch {
    return connectionString;
  }
}

export function poolerRegionCandidates(): readonly string[] {
  const preferred = process.env.SUPABASE_POOLER_REGION?.trim() || DEFAULT_POOLER_REGION;
  return [preferred, ...POOLER_REGIONS.filter((r) => r !== preferred)];
}

export function poolerConnectionCandidates(connectionString: string): string[] {
  try {
    const parsed = parseDatabaseUrl(connectionString);
    if (!parsed.ref || parsed.host.includes("pooler.supabase.com")) {
      return [connectionString];
    }

    const preferredCluster =
      process.env.SUPABASE_POOLER_CLUSTER?.trim() || DEFAULT_POOLER_CLUSTER;
    const clusters = [
      preferredCluster,
      ...POOLER_CLUSTERS.filter((c) => c !== preferredCluster),
    ];

    const out: string[] = [];
    for (const cluster of clusters) {
      for (const region of poolerRegionCandidates()) {
        for (const port of POOLER_PORTS) {
          out.push(
            buildDatabaseUrl({
              user: `postgres.${parsed.ref}`,
              password: parsed.password,
              host: `${cluster}-${region}.pooler.supabase.com`,
              port,
              database: parsed.database,
            }),
          );
        }
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
