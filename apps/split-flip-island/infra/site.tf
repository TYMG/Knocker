# ---------- Static site + one CloudFront for site, API, and photos ----------
#   /            -> site bucket (SPA)
#   /api/*       -> API Gateway (no caching)
#   /leagues/*   -> photos bucket
#
# Every path runs the gate function first (gate.js): no demo password, no app, API or photos.

resource "aws_s3_bucket" "site" {
  bucket_prefix = "${local.name}-site-"
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${local.name}-s3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Holds the demo password record (scrambled password + cookie signing key). It starts empty,
# which keeps the site locked; scripts/demo-password.sh writes it. Terraform never sees the
# password or the record.
resource "aws_cloudfront_key_value_store" "gate" {
  name    = "${local.name}-gate"
  comment = "Demo password gate, written by scripts/demo-password.sh"
}

# The demo password gate. Also sends app routes (no file extension) to index.html so
# refreshes don't 404.
resource "aws_cloudfront_function" "gate" {
  name                         = "${local.name}-gate"
  runtime                      = "cloudfront-js-2.0"
  publish                      = true
  code                         = file("${path.module}/gate.js")
  key_value_store_associations = [aws_cloudfront_key_value_store.gate.arn]
}

# CloudFront adds this header when it passes a request to the API. The API refuses anything
# without it, so nobody can go around the gate by calling API Gateway directly.
resource "random_password" "origin_secret" {
  length  = 48
  special = false
}

resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  is_ipv6_enabled     = true
  aliases             = [local.app_host]
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = local.app_host

  origin {
    origin_id                = "site"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  origin {
    origin_id                = "photos"
    domain_name              = aws_s3_bucket.photos.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  origin {
    origin_id   = "api"
    domain_name = replace(aws_apigatewayv2_api.http.api_endpoint, "https://", "")
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    custom_header {
      name  = "x-origin-verify"
      value = random_password.origin_secret.result
    }
  }

  default_cache_behavior {
    target_origin_id       = "site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    compress               = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.gate.arn
    }
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "api"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.gate.arn
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/leagues/*"
    target_origin_id       = "photos"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.gate.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.wildcard.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

data "aws_iam_policy_document" "site" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.app.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site.json
}

data "aws_iam_policy_document" "photos" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.photos.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.app.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "photos" {
  bucket = aws_s3_bucket.photos.id
  policy = data.aws_iam_policy_document.photos.json
}

resource "aws_route53_record" "app" {
  for_each = toset(["A", "AAAA"])
  zone_id  = data.aws_route53_zone.root.zone_id
  name     = local.app_host
  type     = each.value
  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}

output "app_url" {
  value = "https://${local.app_host}"
}

output "site_bucket" {
  value = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.app.id
}

output "table_name" {
  value = aws_dynamodb_table.main.name
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "gate_store_arn" {
  description = "Where scripts/demo-password.sh writes the demo password record."
  value       = aws_cloudfront_key_value_store.gate.arn
}

# ---------- Browser protections (security headers) ----------
# Sent with every page, file and API answer. They tell the browser to:
#   - only run the app's own scripts (no scripts written into pages, nothing from other sites),
#     so even a mistake that lets someone sneak text into a page can't run their code;
#   - never show the app inside another site's frame (no tricking people into tapping things);
#   - always use HTTPS, and not guess file types;
#   - allow the camera (score photos) only for this site, and nothing else (microphone, location).
# The styles allowance ('unsafe-inline') is needed by the look library (MUI); it can't run code.
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "split-flip-island-security"

  security_headers_config {
    content_security_policy {
      content_security_policy = join("; ", [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "media-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
      ])
      override = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = false
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(self), microphone=(), geolocation=(), payment=(), usb=()"
      override = true
    }
  }
}
