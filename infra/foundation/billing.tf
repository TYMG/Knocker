# ---------- Bill alerts (whole AWS account) ----------
# An email when the month's AWS bill reaches $25, $50 and $100 (decided Oct 29), and as soon as
# it's forecast to pass $100. Free (the first two budgets in an account cost nothing).
# The address is set in alerts.auto.tfvars on this Mac (not in the repo; *.tfvars is ignored).

variable "alert_email" {
  type        = string
  description = "Where bill alerts go."
  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alert_email))
    error_message = "Set alert_email in infra/foundation/alerts.auto.tfvars to an email address."
  }
}

variable "bill_alerts" {
  type    = list(number)
  default = [25, 50, 100]
}

resource "aws_budgets_budget" "monthly" {
  name         = "knckr-monthly"
  budget_type  = "COST"
  limit_amount = tostring(max(var.bill_alerts...))
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  dynamic "notification" {
    for_each = var.bill_alerts
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "ABSOLUTE_VALUE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = [var.alert_email]
    }
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = max(var.bill_alerts...)
    threshold_type             = "ABSOLUTE_VALUE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}
