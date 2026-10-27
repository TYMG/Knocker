#!/usr/bin/env bash
# The league record: set up a season, look at it, or clear the demo.
#   ./scripts/league.sh setup --first-night 2027-01-14 --opens 19:00 --closes 21:00 --machines "Godzilla,Venom"
#   ./scripts/league.sh show
#   ./scripts/league.sh clear      asks you to type the league id first
# Details at the top of apps/split-flip-island/api/scripts/league.ts.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-knckr}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/split-flip-island/api"
[ -d node_modules ] || npm install
exec npx tsx scripts/league.ts "$@"
