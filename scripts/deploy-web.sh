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
# Hashed files can be cached forever. The app shell, the demo password page, the phone
# notifications worker (sw.js) and the app manifest must always be fresh.
FRESH=(index.html gate.html gate-page.js sw.js manifest.webmanifest)
aws s3 sync dist "s3://$BUCKET" --delete --cache-control "public,max-age=31536000,immutable" $(printf -- '--exclude %s ' "${FRESH[@]}")
for f in "${FRESH[@]}"; do
  type=()
  [ "$f" = manifest.webmanifest ] && type=(--content-type application/manifest+json)
  [ -f "dist/$f" ] && aws s3 cp "dist/$f" "s3://$BUCKET/$f" --cache-control "no-cache" ${type[@]+"${type[@]}"}
done
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths $(printf '/%s ' "${FRESH[@]}") > /dev/null
echo "Deployed: $(terraform -chdir="$INFRA" output -raw app_url)"
