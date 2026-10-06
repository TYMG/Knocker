#!/usr/bin/env bash
# Sets the demo password that guards split-flip-island.knckr.com.
#   ./scripts/demo-password.sh                 make a new random password and show it
#   ./scripts/demo-password.sh "my own phrase" use your own (12 characters or more)
#   ./scripts/demo-password.sh --close         remove the password: nobody can get in
#
# Setting a password signs out everyone who was in, so only people you give the new one
# to can come back. Only a scrambled form is stored; the password is shown here once and
# is not saved anywhere, so note it down.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-knckr}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA="$ROOT/apps/split-flip-island/infra"

if [ "$#" -gt 1 ]; then
  echo 'Put a password with spaces in quotes: ./scripts/demo-password.sh "my own phrase"' >&2
  exit 1
fi

STORE="$(terraform -chdir="$INFRA" output -raw gate_store_arn)"
etag() { aws cloudfront-keyvaluestore describe-key-value-store --kvs-arn "$STORE" --query ETag --output text; }

if [ "${1:-}" = "--close" ]; then
  if aws cloudfront-keyvaluestore delete-key --kvs-arn "$STORE" --key gate --if-match "$(etag)" > /dev/null 2>&1; then
    echo "The demo is closed. Nobody can get in until you set a new password."
  else
    echo "The demo was already closed, or the change did not go through. Run it again to check." >&2
    exit 1
  fi
  exit 0
fi

cd "$ROOT/apps/split-flip-island/api"
[ -d node_modules ] || npm install
if [ "$#" -eq 1 ]; then OUT="$(npx tsx scripts/gate-record.ts "$1")"; else OUT="$(npx tsx scripts/gate-record.ts)"; fi
PASSWORD="$(printf '%s\n' "$OUT" | sed -n 1p)"
RECORD="$(printf '%s\n' "$OUT" | sed -n 2p)"

aws cloudfront-keyvaluestore put-key --kvs-arn "$STORE" --key gate --value "$RECORD" --if-match "$(etag)" > /dev/null

echo "The demo password is now:"
echo
echo "    $PASSWORD"
echo
echo "Everyone who was in has been signed out. It can take up to a minute to reach every visitor."
