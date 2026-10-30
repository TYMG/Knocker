# A firewall in front of the site (AWS WAF on CloudFront). Off until full launch: Matt, Oct 30,
# "let's just do it when the demo password comes off". Turn it on with waf_enabled = true.
#
# What it does, in order:
#   1. Blocks any one address sending more than waf_rate_limit requests in 5 minutes. A whole bar
#      shares one address on the bar's wifi, so the limit is set high enough for a full night.
#   2. AWS's list of addresses known for bots and attacks.
#   3. AWS's common protections (bad requests, scanners) and known bad inputs.
# Cost while on: about $5 a month for the firewall, $1 a month per rule (4 here), and $0.60 per
# million requests. While off: nothing.

variable "waf_enabled" {
  description = "Turn on the firewall (AWS WAF) in front of the site. Planned for when the demo password comes off."
  type        = bool
  default     = false
}

variable "waf_rate_limit" {
  description = "Most requests one address may send in 5 minutes before the firewall blocks it for a while."
  type        = number
  # A bar's wifi is one address for every phone in it: 40 phones checking in every few seconds
  # is around 2,000 in 5 minutes, so this leaves room.
  default     = 5000
}

resource "aws_wafv2_web_acl" "site" {
  count       = var.waf_enabled ? 1 : 0
  name        = "${local.name}-site"
  description = "Firewall in front of ${local.app_host}"
  scope       = "CLOUDFRONT" # CloudFront firewalls live in us-east-1, like this stack

  default_action {
    allow {}
  }

  rule {
    name     = "too-many-requests"
    priority = 1
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-too-many-requests"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "bad-addresses"
    priority = 2
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesAmazonIpReputationList"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-bad-addresses"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "common"
    priority = 3
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
        # The app's own limit on request bodies is 32 KB (api/src/util.ts); this rule would stop
        # anything over 8 KB, so it only counts. Photos go straight to storage, not through here.
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-common"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "bad-inputs"
    priority = 4
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-site"
    sampled_requests_enabled   = true
  }
}
