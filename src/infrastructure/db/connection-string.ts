const POOLER_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
] as const;

const POOLER_CLUSTERS = ["aws-0", "aws-1", "aws-2"] as const;
const POOLER_PORTS = [6543, 5432] as const;

function projectRefFromUrl(url: URL): string | null {
  return (
    url.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ??
    url.username.match(/^postgres\.(.+)$/)?.[1] ??
    null
  );
}

/** Rewrite direct `db.*.supabase.co` URLs to IPv4-compatible Supavisor pooler. */
export function toPoolerConnectionString(
  connectionString: string,
  region = process.env.SUPABASE_POOLER_REGION?.trim(),
  cluster = process.env.SUPABASE_POOLER_CLUSTER?.trim() || "aws-0",
): string {
  try {
    const url = new URL(connectionString);
    const ref = projectRefFromUrl(url);
    if (!ref || url.username.startsWith("postgres.")) return connectionString;

    const poolerRegion = region || "us-east-1";
    url.username = `postgres.${ref}`;
    url.hostname = `${cluster}-${poolerRegion}.pooler.supabase.com`;
    url.port = "6543";
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function poolerRegionCandidates(): readonly string[] {
  const preferred = process.env.SUPABASE_POOLER_REGION?.trim();
  if (preferred) return [preferred, ...POOLER_REGIONS.filter((r) => r !== preferred)];
  return POOLER_REGIONS;
}

export function poolerConnectionCandidates(connectionString: string): string[] {
  try {
    const source = new URL(connectionString);
    const ref = projectRefFromUrl(source);
    if (!ref || source.hostname.includes("pooler.supabase.com")) {
      return [connectionString];
    }

    const password = source.password;
    const out: string[] = [];
    const clusters = process.env.SUPABASE_POOLER_CLUSTER
      ? [process.env.SUPABASE_POOLER_CLUSTER.trim()]
      : POOLER_CLUSTERS;

    for (const cluster of clusters) {
      for (const region of poolerRegionCandidates()) {
        for (const port of POOLER_PORTS) {
          const url = new URL(connectionString);
          url.username = `postgres.${ref}`;
          url.password = password;
          url.hostname = `${cluster}-${region}.pooler.supabase.com`;
          url.port = String(port);
          out.push(url.toString());
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
