#!/usr/bin/env bash
# One command for the usual release: build and test the server, then each Terraform stack
# (plan, short summary, your yes, apply), then the web app's browser tests, then the web app.
# Nothing in AWS changes without a yes, and nothing is published if a test fails.
#
#   ./scripts/release.sh          everything: server, league stack, knckr.com stack, web app
#   ./scripts/release.sh server   just the server: build, league stack
#   ./scripts/release.sh web      just the web app
#   add --skip-tests to publish the web app without the browser tests (only when you must)
#
# A stack with nothing to change is skipped. A plan that would delete or replace anything is
# shown in full and needs you to type "replace". Each step still saves its full output in
# .deploy-logs/ (see deploy-step.sh), so you can paste it to Claude.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Run through bash, so a missing "executable" flag on the file can never stop a release.
STEP="bash $ROOT/scripts/deploy-step.sh"
LOGS="$ROOT/.deploy-logs"
WHAT=all
SKIP_TESTS=no
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=yes ;;
    *) WHAT="$arg" ;;
  esac
done

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
stop() { bold "Stopped: $*"; exit 1; }

# Plans a stack, shows what would change, and applies it after a yes.
stack() {
  local name="$1" log="$LOGS/plan-$1.log"
  bold "Planning the $name stack..."
  rm -f "$log"
  $STEP "plan-$name" > /dev/null || { tail -40 "$log"; stop "the $name plan failed (full output: .deploy-logs/plan-$name.log)."; }
  if grep -q 'No changes\.' "$log"; then
    echo "Nothing to change in the $name stack."
    return 0
  fi
  echo "What would change:"
  grep -E '^  # .* (will be|must be)|^Plan:' "$log" | sed 's/^  # /  - /'
  if grep -qE 'must be replaced|will be destroyed|[1-9][0-9]* to destroy' "$log"; then
    bold "WARNING: this plan deletes or replaces something. Full plan: .deploy-logs/plan-$name.log"
    read -r -p "Type replace to apply it anyway, anything else to stop: " answer
    [ "$answer" = "replace" ] || stop "nothing applied. Paste .deploy-logs/plan-$name.log to Claude."
  else
    read -r -p "Apply this to the $name stack? [y/N] " answer
    case "$answer" in y | Y | yes | YES) ;; *) stop "nothing applied to the $name stack." ;; esac
  fi
  $STEP "apply-$name" > /dev/null || { tail -40 "$LOGS/apply-$name.log"; stop "applying the $name stack failed (full output: .deploy-logs/apply-$name.log)."; }
  echo "Applied: $(grep -E '^Apply complete' "$LOGS/apply-$name.log")"
}

server() {
  bold "Building and testing the server..."
  rm -f "$LOGS/build-api.log"
  $STEP build-api > /dev/null || { tail -40 "$LOGS/build-api.log"; stop "the server build or a test failed (full output: .deploy-logs/build-api.log)."; }
  echo "$(grep -E 'Tests +[0-9]+ passed' "$LOGS/build-api.log" | tail -1 | sed 's/\x1b\[[0-9;]*m//g' | xargs). Built."
  stack league
}

web() {
  # The browser tests (Playwright, free, on this computer): a real browser clicks through the
  # built app on the sample league. A few minutes. A failure stops here, before anything is published.
  mkdir -p "$LOGS"
  if [ "$SKIP_TESTS" = yes ]; then
    bold "SKIPPING the browser tests (--skip-tests). Nothing checks this web app before it goes live."
  else
    bold "Running the web app's browser tests (a few minutes)..."
    echo "Building the app for the tests first (about a minute)..."
    # Each test prints one line as it finishes: a check mark when it passes, an X when it fails.
    # The full output still goes to .deploy-logs/web-tests.log.
    (cd "$ROOT/apps/split-flip-island/web" && FORCE_COLOR=0 npm test) 2>&1 | tee "$LOGS/web-tests.log" \
      | grep --line-buffered -E 'Running [0-9]+ tests|✓|✘|^ *[0-9]+ (passed|failed|flaky|skipped)'
    status=${PIPESTATUS[0]}
    if [ "$status" != 0 ]; then
      stop "a browser test failed, so nothing was published. See what happened: cd apps/split-flip-island/web && npm run test:report (full output: .deploy-logs/web-tests.log)."
    fi
  fi
  bold "Publishing the web app..."
  $STEP web > /dev/null || { tail -40 "$LOGS/web.log"; stop "publishing the web app failed (full output: .deploy-logs/web.log)."; }
  echo "Published."
}

case "$WHAT" in
  all) server; stack foundation; web ;;
  server) server ;;
  web) web ;;
  *) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 64 ;;
esac
bold "Done."
