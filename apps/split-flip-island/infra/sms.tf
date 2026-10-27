# ---------- Texting (AWS End User Messaging SMS) ----------
#
# A toll-free number the API texts from, an opt-out list (anyone who replies STOP is never
# texted again), a configuration set, and the HELP auto-reply. Decided Oct 19: texts are only
# for the check-in reminder, one phone per team, opt-in at sign-up. See CLAUDE.md "Texting".
#
# Not Terraform (AWS has no resource for these; they are one-time requests to AWS):
#   - Toll-free registration with the carriers: required before the number can send ANYTHING,
#     even test texts. Free, takes about 2-3 weeks. Once AWS gives a registration ID, set
#     sms_registration_id and plan/apply again to attach it.
#   - Leaving the SMS sandbox (production access) and raising the monthly spend limit.
#   - Verifying a test phone while in the sandbox: scripts/sms-verify.sh (the number is typed
#     in at the prompt and never stored in the repo).

variable "sms_enabled" {
  description = "Lease the toll-free number (about $2 a month) and let the API send texts."
  type        = bool
  default     = true
}

variable "sms_registration_id" {
  description = "The toll-free registration for the league number, filed by hand in the AWS console (no Terraform resource exists for registrations). Recorded here so the link is on file; changing it never replaces the number."
  type        = string
  # Submitted Oct 27, 2026 (us-east-1). Not a secret.
  default     = "registration-ccd58d645c9e4b92816f169520505cb2"
}

locals {
  sms = var.sms_enabled ? 1 : 0
}

resource "aws_pinpointsmsvoicev2_opt_out_list" "sms" {
  count = local.sms
  name  = "${local.name}-opt-outs"
}

resource "aws_pinpointsmsvoicev2_configuration_set" "sms" {
  count                = local.sms
  name                 = "${local.name}-texts"
  default_message_type = "TRANSACTIONAL"
}

resource "aws_pinpointsmsvoicev2_phone_number" "sms" {
  count               = local.sms
  iso_country_code    = "US"
  message_type        = "TRANSACTIONAL"
  number_type         = "TOLL_FREE"
  number_capabilities = ["SMS"]
  opt_out_list_name   = aws_pinpointsmsvoicev2_opt_out_list.sms[0].name
  # AWS answers STOP and HELP itself and keeps the opt-out list.
  self_managed_opt_outs_enabled = false
  registration_id               = var.sms_registration_id
  # A toll-free number stays PENDING until its carrier registration is approved (weeks), so
  # don't hold the apply open waiting for it. The API reports the status.
  wait_for_active             = false
  deletion_protection_enabled = false
}

# The reply to anyone who texts HELP. STOP is handled by AWS and the opt-out list.
resource "aws_pinpointsmsvoicev2_keyword" "help" {
  count                    = local.sms
  origination_identity_arn = aws_pinpointsmsvoicev2_phone_number.sms[0].arn
  keyword                  = "HELP"
  keyword_message          = "Split Flipper Island league reminders from knckr.com. Msg frequency varies, about 1 per league night. Msg & data rates may apply. Reply STOP to stop."
}

data "aws_iam_policy_document" "sms" {
  count = local.sms
  statement {
    actions = ["sms-voice:SendTextMessage"]
    resources = [
      aws_pinpointsmsvoicev2_phone_number.sms[0].arn,
      aws_pinpointsmsvoicev2_configuration_set.sms[0].arn,
      aws_pinpointsmsvoicev2_opt_out_list.sms[0].arn
    ]
  }
  # Read-only checks for the admin Texts page: the number's status, the account's tier, and
  # which test phones are verified. These actions don't take a resource.
  statement {
    actions   = ["sms-voice:DescribePhoneNumbers", "sms-voice:DescribeVerifiedDestinationNumbers", "sms-voice:DescribeAccountAttributes"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "sms" {
  count  = local.sms
  name   = "${local.name}-api-sms"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.sms[0].json
}

# The check-in reminder: runs the API function every 5 minutes with {"task": "reminders"}. The
# function does nothing unless tonight's league night starts within the next few minutes; then it
# texts opted-in phones on teams that haven't checked in, once per night (api/src/reminders.ts).
resource "aws_cloudwatch_event_rule" "reminders" {
  count               = local.sms
  name                = "${local.name}-check-in-reminders"
  description         = "Texts the check-in reminder about 5 minutes before a league night starts"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "reminders" {
  count = local.sms
  rule  = aws_cloudwatch_event_rule.reminders[0].name
  arn   = aws_lambda_function.api.arn
  input = jsonencode({ task = "reminders" })
}

resource "aws_lambda_permission" "reminders" {
  count         = local.sms
  statement_id  = "AllowCheckInReminderSchedule"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.reminders[0].arn
}

# Hands the number to the knckr.com stack (infra/foundation), which publishes the "Add to
# contacts" card at knckr.com/split-flip-island.vcf. This way the number never sits in the code.
resource "aws_ssm_parameter" "sms_number" {
  count       = local.sms
  name        = "/knckr/split-flip-island/sms-number"
  description = "Split Flipper Island's toll-free texting number, for the contact card on knckr.com."
  type        = "String"
  value       = aws_pinpointsmsvoicev2_phone_number.sms[0].phone_number
}

output "sms_phone_number" {
  description = "The league's toll-free texting number (it can't send until its registration is approved)."
  value       = var.sms_enabled ? aws_pinpointsmsvoicev2_phone_number.sms[0].phone_number : null
}

output "sms_phone_number_status" {
  value = var.sms_enabled ? aws_pinpointsmsvoicev2_phone_number.sms[0].status : null
}
