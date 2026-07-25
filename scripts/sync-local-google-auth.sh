#!/usr/bin/env bash
# Sync Google Auth secrets from Vercel Production into local .env.local
# Run this in Terminal.app / iTerm (not via the Cursor agent) so Vercel can
# return Sensitive values.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp)"
cd "$ROOT"

if [[ ! -f .vercel/project.json ]]; then
  echo "Link the project first: npx vercel link"
  exit 1
fi

npx vercel env pull "$TMP" --environment=production --yes

python3 - "$TMP" "$ROOT/.env.local" <<'PY'
import re, sys
from pathlib import Path

src, dest = Path(sys.argv[1]), Path(sys.argv[2])
text = src.read_text()

def get(name: str) -> str | None:
    m = re.search(rf"^{re.escape(name)}=(.*)$", text, re.M)
    if not m:
        return None
    v = m.group(1).strip()
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        v = v[1:-1]
    if not v or v == "[SENSITIVE]":
        return None
    return v

needed = ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "AUTH_SECRET"]
vals = {k: get(k) for k in needed}
missing = [k for k, v in vals.items() if not v]
if missing:
    print("Could not read:", ", ".join(missing))
    print("Open Vercel → Project → Settings → Environment Variables and paste them into .env.local")
    sys.exit(1)

local = dest.read_text() if dest.exists() else ""
lines = []
skip = {
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "AUTH_SECRET",
    "AUTH_URL",
    "GOOGLE_AUTH_ENABLED",
    "ALLOW_TEST_LOGIN",
}
for line in local.splitlines():
    if not line.strip() or line.strip().startswith("#"):
        lines.append(line)
        continue
    key = line.split("=", 1)[0].strip()
    if key in skip:
        continue
    lines.append(line)

lines += [
    "",
    "# Local dual auth: Google (from Vercel) + test login",
    "GOOGLE_AUTH_ENABLED=true",
    "ALLOW_TEST_LOGIN=true",
    "AUTH_URL=http://localhost:3000",
    f"AUTH_SECRET={vals['AUTH_SECRET']}",
    f"AUTH_GOOGLE_ID={vals['AUTH_GOOGLE_ID']}",
    f"AUTH_GOOGLE_SECRET={vals['AUTH_GOOGLE_SECRET']}",
]
dest.write_text("\n".join(lines).rstrip() + "\n")
print(f"Updated {dest}")
print("Also add this redirect URI in Google Cloud OAuth client:")
print("  http://localhost:3000/api/auth/callback/google")
print("Then restart: npm run dev")
PY

rm -f "$TMP"
