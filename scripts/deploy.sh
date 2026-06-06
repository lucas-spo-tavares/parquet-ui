#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"
DIST_DIR="$ROOT_DIR/dist"

cd "$ROOT_DIR"

npm run build

bucket_name="$(terraform -chdir="$INFRA_DIR" output -raw bucket_name)"
cloudfront_distribution_id="$(terraform -chdir="$INFRA_DIR" output -raw cloudfront_distribution_id)"

aws s3 sync "$DIST_DIR/" "s3://$bucket_name" --delete
aws cloudfront create-invalidation --distribution-id "$cloudfront_distribution_id" --paths '/*'
