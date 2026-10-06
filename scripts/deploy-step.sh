#!/usr/bin/env bash
# Runs one step of the first deploy and saves everything it prints to
# .deploy-logs/<step>.log so the result can be reviewed before the next step.
#
#   check              tools, AWS login and the knckr.com zone. Changes nothing.
#   plan-state         plan the Terraform state bucket. Changes nothing.
#   apply-state        create it, then write infra/backend.hcl.
#   plan-foundation    plan the certificate, knckr.com root and redirect. Changes nothing.
#   apply-foundation   create them (the certificate can take about 5 minutes).
#   build-api          install, test and build the API.
#   plan-league        plan the site, API, database and photo storage. Changes nothing.
#   apply-league       create them.
#   web                build the web app and publish it.
#
# Every apply-* step applies exactly the plan saved by its plan-* step, nothing else.
set -uo pipefail
export AWS_PROFILE="${AWS_PROFILE:-knckr}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STEP="${1:-}"
LOGS="$ROOT/.deploy-logs"

stack_dir() {
  case "$1" in
    state) echo "$ROOT/infra/bootstrap" ;;
    foundation) echo "$ROOT/infra/foundation" ;;
    league) echo "$ROOT/apps/split-flip-island/infra" ;;
    *) return 1 ;;
  esac
}

check() {
  local missing=0
  echo "== tools"
  for tool in aws terraform node npm; do
    if command -v "$tool" > /dev/null; then echo "$tool: $("$tool" --version 2>&1 | head -1)"; else echo "$tool: NOT INSTALLED"; missing=1; fi
  done
  echo "== AWS login (profile $AWS_PROFILE)"
  aws sts get-caller-identity --query Arn --output text || return 1
  echo "== Route 53 zones"
  aws route53 list-hosted-zones --query 'HostedZones[].Name' --output text || return 1
  if [ "$missing" -ne 0 ]; then echo "Install the tools marked NOT INSTALLED, then run check again."; return 1; fi
}

plan() {
  local dir
  dir="$(stack_dir "$1")" || return 2
  cd "$dir" || return 1
  if [ "$1" = state ]; then
    terraform init -input=false -no-color || return 1
  else
    if [ ! -f "$ROOT/infra/backend.hcl" ]; then echo "infra/backend.hcl is missing. Run apply-state first."; return 1; fi
    terraform init -input=false -no-color -backend-config="$ROOT/infra/backend.hcl" || return 1
  fi
  terraform plan -input=false -no-color -out=tfplan
}

apply() {
  local dir
  dir="$(stack_dir "$1")" || return 2
  cd "$dir" || return 1
  if [ ! -f tfplan ]; then echo "No saved plan here. Run plan-$1 first."; return 1; fi
  terraform apply -input=false -no-color tfplan || return 1
  rm -f tfplan
  if [ "$1" = state ]; then
    printf 'bucket = "%s"\n' "$(terraform output -raw state_bucket)" > "$ROOT/infra/backend.hcl" || return 1
    echo "Wrote infra/backend.hcl"
  fi
  terraform output -no-color
}

build_api() {
  cd "$ROOT/apps/split-flip-island/api" || return 1
  npm install && npm test && npm run build
}

run() {
  case "$STEP" in
    check) check ;;
    plan-state | plan-foundation | plan-league) plan "${STEP#plan-}" ;;
    apply-state | apply-foundation | apply-league) apply "${STEP#apply-}" ;;
    build-api) build_api ;;
    web) "$ROOT/scripts/deploy-web.sh" ;;
    *) return 64 ;;
  esac
}

case "$STEP" in
  check | plan-state | apply-state | plan-foundation | apply-foundation | build-api | plan-league | apply-league | web) ;;
  *) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 64 ;;
esac

mkdir -p "$LOGS"
{
  echo "STEP $STEP started $(date '+%Y-%m-%d %H:%M:%S')"
  run
  code=$?
  if [ "$code" -eq 0 ]; then echo "STEP $STEP: OK"; else echo "STEP $STEP: FAILED (exit $code)"; fi
  exit "$code"
} 2>&1 | tee "$LOGS/$STEP.log"
# Pass the step's result on, so steps chained with && stop at the first failure.
exit "${PIPESTATUS[0]}"
