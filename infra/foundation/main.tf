# Shared knckr.com stack: certificate, root site, and path redirects.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    key          = "foundation/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    # bucket comes from backend.hcl (see README)
  }
}

provider "aws" {
  region = "us-east-1" # CloudFront certificates must live in us-east-1
  default_tags {
    tags = { Project = "knckr", Stack = "foundation" }
  }
}

variable "domain" {
  type    = string
  default = "knckr.com"
}

# Path on knckr.com -> app subdomain. Add a line per future app.
variable "redirects" {
  type = map(string)
  default = {
    "/split-flip-island" = "https://split-flip-island.knckr.com"
  }
}

# The hosted zone already exists (domain registered in Route 53). Reference it; never create it.
data "aws_route53_zone" "root" {
  name         = var.domain
  private_zone = false
}

# ---------- Wildcard certificate: knckr.com + *.knckr.com ----------

resource "aws_acm_certificate" "wildcard" {
  domain_name               = var.domain
  subject_alternative_names = ["*.${var.domain}"]
  validation_method         = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.wildcard.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }
  zone_id         = data.aws_route53_zone.root.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "wildcard" {
  certificate_arn         = aws_acm_certificate.wildcard.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ---------- Root landing page ----------

resource "aws_s3_bucket" "landing" {
  bucket_prefix = "knckr-landing-"
}

resource "aws_s3_bucket_public_access_block" "landing" {
  bucket                  = aws_s3_bucket.landing.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "index" {
  bucket        = aws_s3_bucket.landing.id
  key           = "index.html"
  source        = "${path.module}/site/index.html"
  etag          = filemd5("${path.module}/site/index.html")
  content_type  = "text/html; charset=utf-8"
  cache_control = "max-age=300"
}

resource "aws_cloudfront_origin_access_control" "landing" {
  name                              = "knckr-landing"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "redirects" {
  name    = "knckr-root-redirects"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = templatefile("${path.module}/redirects.js.tftpl", { redirects = jsonencode(var.redirects) })
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "root" {
  enabled             = true
  is_ipv6_enabled     = true
  aliases             = [var.domain]
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "knckr.com root"

  origin {
    origin_id                = "landing"
    domain_name              = aws_s3_bucket.landing.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.landing.id
  }

  default_cache_behavior {
    target_origin_id       = "landing"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.redirects.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.wildcard.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

data "aws_iam_policy_document" "landing" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.landing.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.root.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "landing" {
  bucket = aws_s3_bucket.landing.id
  policy = data.aws_iam_policy_document.landing.json
}

resource "aws_route53_record" "root" {
  for_each = toset(["A", "AAAA"])
  zone_id  = data.aws_route53_zone.root.zone_id
  name     = var.domain
  type     = each.value
  alias {
    name                   = aws_cloudfront_distribution.root.domain_name
    zone_id                = aws_cloudfront_distribution.root.hosted_zone_id
    evaluate_target_health = false
  }
}

output "certificate_arn" {
  value = aws_acm_certificate_validation.wildcard.certificate_arn
}

output "root_url" {
  value = "https://${var.domain}"
}
