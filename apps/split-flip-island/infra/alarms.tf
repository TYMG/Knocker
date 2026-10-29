# ---------- Alarms: an email when something is wrong with the app ----------
# Bill alerts live in the knckr.com stack (infra/foundation/billing.tf). These watch the league
# itself. Each emails the same address (set in alerts.auto.tfvars on this Mac, not in the repo).
# AWS sends a "confirm subscription" email first: click the link once, or no alarm arrives.

variable "alert_email" {
  type        = string
  description = "Where the app's alarms go."
  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alert_email))
    error_message = "Set alert_email in apps/split-flip-island/infra/alerts.auto.tfvars to an email address."
  }
}

resource "aws_sns_topic" "alarms" {
  name = "${local.name}-alarms"
}

resource "aws_sns_topic_subscription" "alarms_email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

locals {
  fn = aws_lambda_function.api.function_name
  alarm_common = {
    alarm_actions = [aws_sns_topic.alarms.arn]
    ok_actions    = [aws_sns_topic.alarms.arn]
  }
}

# The server is failing: more than 5 errors in 5 minutes.
resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "${local.name}-server-errors"
  alarm_description   = "The league server is failing. Look at ./scripts/deploy-step.sh api-logs."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = local.fn }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 5
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_common.alarm_actions
  ok_actions          = local.alarm_common.ok_actions
}

# The server hit its ceiling (api_max_concurrency) and turned requests away: a rush, or a flood.
resource "aws_cloudwatch_metric_alarm" "api_throttles" {
  alarm_name          = "${local.name}-server-at-ceiling"
  alarm_description   = "The league server turned requests away at its ceiling of ${var.api_max_concurrency}. A rush of players (raise api_max_concurrency) or a flood of bot traffic."
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  dimensions          = { FunctionName = local.fn }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 10
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_common.alarm_actions
  ok_actions          = local.alarm_common.ok_actions
}

# Way more traffic than a league night: over 30,000 requests in an hour (a night is a few thousand).
resource "aws_cloudwatch_metric_alarm" "api_flood" {
  alarm_name          = "${local.name}-traffic-flood"
  alarm_description   = "Far more requests than a league night. Someone may be hammering the site."
  namespace           = "AWS/Lambda"
  metric_name         = "Invocations"
  dimensions          = { FunctionName = local.fn }
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 30000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_common.alarm_actions
  ok_actions          = local.alarm_common.ok_actions
}

# Messages the server writes to its log when something needs a person.
locals {
  log_alarms = {
    "league-record-large" = { pattern = "LEAGUE_RECORD_LARGE", description = "The league record is getting big (over 150 KB). Ask Claude to look before it fills up." }
    "league-record-full"  = { pattern = "LEAGUE_RECORD_TOO_BIG", description = "The league record is full and changes are being refused. Needs attention now." }
    "push-failing"        = { pattern = "\"Push delivery failed\"", description = "Phone notifications are failing to send." }
    "texts-capped"        = { pattern = "TextLimitReached", description = "The daily text limit was reached (per phone or the league's 200). Normal once in a while; often means something is wrong." }
  }
}

resource "aws_cloudwatch_log_metric_filter" "app" {
  for_each       = local.log_alarms
  name           = "${local.name}-${each.key}"
  log_group_name = aws_cloudwatch_log_group.api.name
  pattern        = each.value.pattern
  metric_transformation {
    name          = each.key
    namespace     = "SplitFlipIsland"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "app" {
  for_each            = local.log_alarms
  alarm_name          = "${local.name}-${each.key}"
  alarm_description   = each.value.description
  namespace           = "SplitFlipIsland"
  metric_name         = each.key
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_common.alarm_actions
  depends_on          = [aws_cloudwatch_log_metric_filter.app]
}
