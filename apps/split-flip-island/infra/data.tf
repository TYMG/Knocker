# ---------- DynamoDB: single table ----------

resource "aws_dynamodb_table" "main" {
  name                        = local.name
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "PK"
  range_key                   = "SK"
  deletion_protection_enabled = true

  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
  attribute {
    name = "GSI1PK"
    type = "S"
  }
  attribute {
    name = "GSI1SK"
    type = "S"
  }
  attribute {
    name = "FLAGPK"
    type = "S"
  }
  attribute {
    name = "FLAGSK"
    type = "S"
  }

  # A team's scores across the season, sorted by night.
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # Sparse index: only flagged scores carry FLAGPK. Admin review queue (phase 2).
  global_secondary_index {
    name            = "FLAGGED"
    hash_key        = "FLAGPK"
    range_key       = "FLAGSK"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# ---------- S3: photos ----------

resource "aws_s3_bucket" "photos" {
  bucket_prefix = "${local.name}-photos-"
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket                  = aws_s3_bucket.photos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Browsers upload straight to S3 with presigned POSTs.
resource "aws_s3_bucket_cors_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id
  cors_rule {
    allowed_methods = ["POST"]
    allowed_origins = ["https://${local.app_host}", "http://localhost:5173"]
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  # Old score photos move to cheaper storage after a season.
  rule {
    id     = "archive-old-score-photos"
    status = "Enabled"
    filter {
      prefix = "leagues/${var.league_id}/scores/"
    }
    transition {
      days          = 120
      storage_class = "GLACIER_IR"
    }
  }

  # Sign-up photos wait under pending/ until an admin approves the team, which copies the
  # photo to teams/. Whatever is left (abandoned or unapproved sign-ups) is deleted here, a
  # day after the approval window closes.
  rule {
    id     = "delete-unapproved-sign-up-photos"
    status = "Enabled"
    filter {
      prefix = "leagues/${var.league_id}/pending/"
    }
    expiration {
      days = ceil(var.pending_team_hours / 24) + 1
    }
  }
}
