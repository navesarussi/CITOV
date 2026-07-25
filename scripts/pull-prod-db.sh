#!/usr/bin/env bash
# Dump production Postgres into a local restore file, then optionally load it.
# Requires DATABASE_URL in .env.local (paste from Vercel/Supabase — Sensitive, agent can't pull it).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local"
  exit 1
fi

# shellcheck disable=SC1091
set -a
# Load only DATABASE_URL without sourcing secrets into the shell history awkwardly
DATABASE_URL="$(python3 - <<'PY'
from pathlib import Path
for line in Path(".env.local").read_text().splitlines():
    if line.startswith("DATABASE_URL="):
        v=line.split("=",1)[1].strip()
        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
            v=v[1:-1]
        print(v)
        break
PY
)"
set +a

if [[ -z "${DATABASE_URL}" ]]; then
  echo "DATABASE_URL is empty in .env.local"
  echo "Paste the Production Postgres URI from Vercel or Supabase → Settings → Database"
  exit 1
fi

OUT="${1:-./tmp/prod-dump.sql}"
mkdir -p "$(dirname "$OUT")"
echo "Dumping production → $OUT"
pg_dump "$DATABASE_URL" --no-owner --no-acl --format=plain --file="$OUT"
echo "Done. To load into a local Postgres:"
echo "  createdb citov_local"
echo "  psql citov_local < $OUT"
echo "Then set DATABASE_URL=postgresql://localhost/citov_local in .env.local"
