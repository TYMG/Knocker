#!/usr/bin/env bash
# Texting test phones, while the AWS account is in the SMS sandbox (texts reach verified phones only).
#
#   ./scripts/sms-verify.sh add      asks for your number, texts it a code, then asks for the code
#   ./scripts/sms-verify.sh list     shows verified test phones (last 4 digits only)
#   ./scripts/sms-verify.sh status   shows the league number's status and the account tier
#
# The number is typed in at the prompt and only ever sent to AWS. Never put it in the repo.
# Sending the code needs the league's toll-free number to be ACTIVE, which happens once its
# carrier registration is approved. Until then "add" stops at that step and says so.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-knckr}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SMS="aws pinpoint-sms-voice-v2"

origination() {
  terraform -chdir="$ROOT/apps/split-flip-island/infra" output -raw sms_phone_number 2>/dev/null || true
}

status() {
  local num; num="$(origination)"
  if [ -z "$num" ] || [ "$num" = "null" ]; then echo "Texting is off or not applied yet (sms_phone_number output is empty)."; return; fi
  echo "League number: $num"
  $SMS describe-phone-numbers --query "PhoneNumbers[?PhoneNumber=='$num'].Status | [0]" --output text | sed 's/^/Status: /'
  $SMS describe-account-attributes --query "AccountAttributes[?Name=='ACCOUNT_TIER'].Value | [0]" --output text | sed 's/^/Account tier: /'
}

list() {
  $SMS describe-verified-destination-numbers --query 'VerifiedDestinationNumbers[].[DestinationPhoneNumber,Status]' --output text |
    awk '{ printf "  ...%s  %s\n", substr($1, length($1)-3), $2 }'
}

add() {
  read -r -p "Your mobile number, digits only (e.g. 2025550142): " raw
  local digits="${raw//[^0-9]/}"
  [ "${#digits}" -eq 10 ] && digits="1$digits"
  if [ "${#digits}" -ne 11 ] || [ "${digits:0:1}" != "1" ]; then echo "That doesn't look like a US number."; exit 1; fi
  local e164="+$digits"
  local id
  id="$($SMS describe-verified-destination-numbers --query "VerifiedDestinationNumbers[?DestinationPhoneNumber=='$e164'].VerifiedDestinationNumberId | [0]" --output text)"
  if [ -z "$id" ] || [ "$id" = "None" ]; then
    id="$($SMS create-verified-destination-number --destination-phone-number "$e164" --query VerifiedDestinationNumberId --output text)"
  fi
  echo "Added (...${digits: -4}). Texting it a code..."
  local num; num="$(origination)"
  if ! $SMS send-destination-number-verification-code --verified-destination-number-id "$id" --verification-channel TEXT ${num:+--origination-identity "$num"} >/dev/null; then
    echo "AWS couldn't send the code. Most likely the league number isn't ACTIVE yet (its carrier registration is still pending)."
    echo "Run '$0 status' to check, and try 'add' again once it says ACTIVE."
    exit 1
  fi
  read -r -p "Code from the text: " code
  $SMS verify-destination-number --verified-destination-number-id "$id" --verification-code "$code" --query Status --output text | sed 's/^/Status: /'
}

case "${1:-}" in
  add) add ;;
  list) list ;;
  status) status ;;
  *) sed -n '2,10p' "$0"; exit 1 ;;
esac
