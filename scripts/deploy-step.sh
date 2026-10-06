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
#   check-gate         confirm the live site serves nothing but the password page. Changes nothing.
#   diagnose-gate      ask CloudFront to test-run the gate and report any error. Changes nothing.
#   api-logs           show what the API logged in the last 30 minutes (errors only). Changes nothing.
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

# Asks the live site for things only someone past the demo password should get, and checks
# every one is refused. Safe to run any time; it sends no password and changes nothing.
check_gate() {
  local infra base api code page fails=0
  infra="$(stack_dir league)"
  base="$(terraform -chdir="$infra" output -raw app_url)" || return 1
  api="$(terraform -chdir="$infra" output -raw api_endpoint)" || return 1
  expect() { # label, wanted status (or "a|b"), then curl arguments
    code="$(curl -s -m 20 -o /dev/null -w '%{http_code}' "${@:3}")"
    case "|$2|" in
      *"|$code|"*) echo "ok     $1 ($code)" ;;
      *) echo "WRONG  $1: got $code, wanted $2"; fails=1 ;;
    esac
  }
  page="$(curl -s -m 20 "$base/")"
  if printf '%s' "$page" | grep -q 'Demo password' && ! printf '%s' "$page" | grep -q '/assets/'; then
    echo "ok     the front page is the password page, with no app code in it"
  else
    echo "WRONG  the front page is not the plain password page"; fails=1
  fi
  expect "an app address shows the password page" 200 "$base/standings"
  expect "the app's own page is refused" 403 "$base/index.html"
  expect "reading standings is refused" 401 "$base/api/standings"
  expect "signing up a team is refused" 401 -X POST -H 'content-type: application/json' -d '{}' "$base/api/teams"
  expect "admin log in is refused" 401 -X POST -H 'content-type: application/json' -d '{}' "$base/api/admin/login"
  expect "photos are refused" 403 "$base/leagues/sfi-s1/teams/x.jpg"
  expect "a made-up pass is refused" 401 -H 'cookie: sfi_gate=9999999999.abcdef' "$base/api/standings"
  expect "a wrong password is refused" "401|503" -H 'x-demo-pass: 0000000000000000000000000000000000000000000000000000000000000000' "$base/gate/enter"
  expect "going around the site to the API is refused" 403 "$api/api/standings"
  expect "going around with a guessed key is refused" 403 -H 'x-origin-verify: guess' "$api/api/standings"
  return "$fails"
}

# Runs the live gate function inside CloudFront's own test harness with sample requests and
# prints what it returned or why it failed. Reads only; nothing on the site changes.
diagnose_gate() {
  local name="split-flip-island-gate" etag event base
  export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
  echo "== function"
  aws cloudfront describe-function --name "$name" --stage LIVE \
    --query 'FunctionSummary.{status:Status,runtime:FunctionConfig.Runtime,stores:FunctionConfig.KeyValueStoreAssociations.Items[].KeyValueStoreARN,stage:FunctionMetadata.Stage}' --output json | sed -E 's/[0-9]{12}/<account>/g' || return 1
  echo "== key value store"
  aws cloudfront describe-key-value-store --name "$name" --query 'KeyValueStore.{status:Status,name:Name}' --output json || return 1
  etag="$(aws cloudfront describe-function --name "$name" --stage LIVE --query ETag --output text)" || return 1
  event="$(mktemp)"
  for uri in / /api/standings /gate/enter; do
    echo "== test run: GET $uri with no pass"
    printf '{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"198.51.100.1"},"request":{"method":"GET","uri":"%s","querystring":{},"headers":{"host":{"value":"split-flip-island.knckr.com"}},"cookies":{}}}' "$uri" > "$event"
    aws cloudfront test-function --name "$name" --if-match "$etag" --stage LIVE --event-object "fileb://$event" \
      --query 'TestResult.{error:FunctionErrorMessage,logs:FunctionExecutionLogs,computeUsedPercent:ComputeUtilization,output:FunctionOutput}' --output json
  done
  rm -f "$event"
  base="$(terraform -chdir="$(stack_dir league)" output -raw app_url)" || return 1
  echo "== what the live site answers"
  curl -s -m 20 -o /dev/null -D - "$base/" | grep -i -E '^HTTP|x-cache|x-amzn-errortype|server:' | tr -d '\r'
}

# The API only writes to its log when something goes wrong (and when the 15-minute cleanup
# runs), so this is a short list. It never logs passwords, PINs or request contents.
api_logs() {
  export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
  aws logs tail "/aws/lambda/split-flip-island-api" --since 30m --format short 2>&1 \
    | grep -v -E '(START|END|REPORT|INIT_START) ' | sed -E 's/[0-9]{12}/<account>/g' | tail -120
  echo "(end of log)"
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
    check-gate) check_gate ;;
    diagnose-gate) diagnose_gate ;;
    api-logs) api_logs ;;
    *) return 64 ;;
  esac
}

case "$STEP" in
  check | plan-state | apply-state | plan-foundation | apply-foundation | build-api | plan-league | apply-league | web | check-gate | diagnose-gate | api-logs) ;;
  *) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 64 ;;
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
