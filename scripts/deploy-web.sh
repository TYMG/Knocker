#!/usr/bin/env bash
# Builds the web app and publishes it to S3 + CloudFront.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-knckr}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA="$ROOT/apps/split-flip-island/infra"
BUCKET="$(terraform -chdir="$INFRA" output -raw site_bucket)"
DIST_ID="$(terraform -chdir="$INFRA" output -raw distribution_id)"

cd "$ROOT/apps/split-flip-island/web"
npm ci && npm run build
# Hashed files can be cached forever. The app shell and the demo password page must always be fresh.
aws s3 sync dist "s3://$BUCKET" --delete --cache-control "public,max-age=31536000,immutable" --exclude index.html --exclude gate.html
aws s3 cp dist/index.html "s3://$BUCKET/index.html" --cache-control "no-cache"
aws s3 cp dist/gate.html "s3://$BUCKET/gate.html" --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/index.html" "/gate.html" > /dev/null
echo "Deployed: $(terraform -chdir="$INFRA" output -raw app_url)"
