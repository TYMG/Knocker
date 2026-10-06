#!/usr/bin/env bash
# Sets the demo password that guards split-flip-island.knckr.com.
#   ./scripts/demo-password.sh            make a new random password and show it
#   ./scripts/demo-password.sh --choose   type your own at a hidden prompt (12 characters or more)
#   ./scripts/demo-password.sh --close    remove the password: nobody can get in
#   ./scripts/demo-password.sh --check    type a password and see whether the live site accepts
#                                         it; changes nothing
#
# Setting a password signs out everyone who was in, so only people you give the new one
# to can come back. Only a scrambled form is stored; the password is shown here once and
# is not saved anywhere, so note it down. A random one is harder to guess than a phrase.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-knckr}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA="$ROOT/apps/split-flip-island/infra"
MODE="${1:-}"

case "$MODE" in
  "" | --choose | --close | --check) ;;
  *)
    echo "Usage: ./scripts/demo-password.sh [--choose | --close | --check]" >&2
    echo "Passwords are never given on the command line; --choose asks for one at a hidden prompt." >&2
    exit 1
    ;;
esac

STORE="$(terraform -chdir="$INFRA" output -raw gate_store_arn)"
SITE="$(terraform -chdir="$INFRA" output -raw app_url)"
store() { aws cloudfront-keyvaluestore describe-key-value-store --kvs-arn "$STORE" --query "$1" --output text; }

# Asks the live site whether it accepts a password, the same way the password page does.
# Reads the password on standard input; prints the site's answer (200 = accepted, 401 = wrong
# password, 503 = no password is set). The password never appears in a command line.
site_answer() {
  local proof
  proof="$(cd "$ROOT/apps/split-flip-island/api" && npx tsx scripts/gate-record.ts --proof)" || return 1
  printf 'header = "x-demo-pass: %s"\n' "$proof" | curl -s -m 20 -o /dev/null -w '%{http_code}' -K - "$SITE/gate/enter"
}

if [ "$MODE" = "--close" ]; then
  if [ "$(store ItemCount)" = "0" ]; then
    echo "The demo is already closed. Nobody can get in until you set a password."
    exit 0
  fi
  aws cloudfront-keyvaluestore delete-key --kvs-arn "$STORE" --key gate --if-match "$(store ETag)" > /dev/null
  if [ "$(store ItemCount)" != "0" ]; then
    echo "The demo is NOT closed: the change did not go through. Run this again." >&2
    exit 1
  fi
  echo "The demo is closed. Nobody can get in until you set a new password."
  exit 0
fi

cd "$ROOT/apps/split-flip-island/api"
[ -d node_modules ] || npm install

if [ "$MODE" = "--check" ]; then
  printf 'Demo password to check (nothing shows as you type): '
  IFS= read -r -s TRY
  printf '\n'
  ANSWER="$(printf '%s' "$TRY" | site_answer)"
  unset TRY
  case "$ANSWER" in
    200) echo "Yes: the live site accepts that password." ;;
    401) echo "No: that is not the current demo password. (Capitals and extra spaces don't matter; everything else does.)" ;;
    503) echo "No password is set right now, so the site lets nobody in. Run ./scripts/demo-password.sh to set one." ;;
    *) echo "Could not tell: the site answered $ANSWER." >&2; exit 1 ;;
  esac
  exit 0
fi

if [ "$MODE" = "--choose" ]; then
  printf 'New demo password (12 characters or more, nothing shows as you type): '
  IFS= read -r -s CHOSEN
  printf '\nSame password again: '
  IFS= read -r -s AGAIN
  printf '\n'
  if [ "$CHOSEN" != "$AGAIN" ]; then
    echo "Those two don't match. Nothing was changed." >&2
    exit 1
  fi
  OUT="$(printf '%s' "$CHOSEN" | npx tsx scripts/gate-record.ts --stdin)"
  unset CHOSEN AGAIN
else
  OUT="$(npx tsx scripts/gate-record.ts)"
fi
PASSWORD="$(printf '%s\n' "$OUT" | sed -n 1p)"
RECORD="$(printf '%s\n' "$OUT" | sed -n 2p)"
if [ -z "$PASSWORD" ] || [ -z "$RECORD" ]; then
  echo "Could not make the password record. Nothing was changed." >&2
  exit 1
fi

aws cloudfront-keyvaluestore put-key --kvs-arn "$STORE" --key gate --value "$RECORD" --if-match "$(store ETag)" > /dev/null

echo "The demo password is now:"
echo
echo "    $PASSWORD"
echo
echo "Everyone who was in has been signed out."

# Prove it on the live site, so a problem shows up here and not on someone's phone.
printf 'Checking that the live site accepts it'
ANSWER=""
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  ANSWER="$(printf '%s' "$PASSWORD" | site_answer || true)"
  [ "$ANSWER" = "200" ] && break
  printf '.'
  sleep 5
done
echo
if [ "$ANSWER" = "200" ]; then
  echo "Checked: the live site accepts this password."
else
  echo "WARNING: after a minute the live site still does not accept it (it answered ${ANSWER:-nothing})." >&2
  echo "The password was saved. Try it in a browser in another minute; if it still fails, something is wrong with the gate." >&2
  exit 1
fi
