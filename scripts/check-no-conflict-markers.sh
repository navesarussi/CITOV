#!/usr/bin/env bash
# Fail CI if git conflict markers were committed (merge accident).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PATTERN='^(<<<<<<< |=======|>>>>>>> )'
if git grep -E "$PATTERN" -- ':!scripts/check-no-conflict-markers.sh' 2>/dev/null; then
  echo "error: git conflict markers found in tracked files (see above)"
  exit 1
fi
echo "ok: no conflict markers"
