# Split Flipper Island stack: site, API, data, and photos at split-flip-island.knckr.com.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 6.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.4" }
    random  = { source = "hashicorp/random", version = "~> 3.6" }
  }
  backend "s3" {
    key          = "apps/split-flip-island/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    # bucket comes from backend.hcl (see README)
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = { Project = "knckr", Stack = "split-flip-island" }
  }
}

variable "domain" {
  type    = string
  default = "knckr.com"
}

variable "subdomain" {
  type    = string
  default = "split-flip-island"
}

variable "league_id" {
  type    = string
  default = "sfi-s1"
}

locals {
  name     = "split-flip-island"
  app_host = "${var.subdomain}.${var.domain}"
}

data "aws_route53_zone" "root" {
  name         = var.domain
  private_zone = false
}

# Wildcard certificate created by the foundation stack.
data "aws_acm_certificate" "wildcard" {
  domain      = var.domain
  statuses    = ["ISSUED"]
  most_recent = true
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}
