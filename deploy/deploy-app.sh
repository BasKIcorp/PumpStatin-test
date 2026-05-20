#!/bin/bash
# Pull latest code, build frontend, restart service.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/pumpstatin-test}"
BRANCH="${BRANCH:-master}"
REPO_URL="${REPO_URL:-git@github.com:BasKIcorp/PumpStatin-test.git}"
ENV_FILE="${ENV_FILE:-$INSTALL_DIR/deploy/production.env}"

cd "$INSTALL_DIR"

if [[ -d .git ]]; then
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

export NODE_ENV=production

cd frontend
npm ci
npm run db:seed
npm run build

systemctl restart pumpstatin-frontend
systemctl --no-pager status pumpstatin-frontend || true
echo "Deploy finished: $(git rev-parse --short HEAD)"
