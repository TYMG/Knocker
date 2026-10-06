#!/usr/bin/env bash
# Manages admin accounts for Split Flipper Island. Admins can only be created here.
#   ./scripts/admin.sh add "Name"        asks for a password at a hidden prompt
#   ./scripts/admin.sh password "Name"   new password; signs that admin out everywhere
#   ./scripts/admin.sh remove "Name"
#   ./scripts/admin.sh list
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-knckr}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/split-flip-island/api"
[ -d node_modules ] || npm install
exec npx tsx scripts/admin.ts "$@"
