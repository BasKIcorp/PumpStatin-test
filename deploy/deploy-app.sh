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

mkdir -p "$INSTALL_DIR/data"
cd frontend

# На VPS npm ci иногда оставляет битый node_modules (ENOENT в @radix-ui, lodash/_getRawTag.js и др.)
npm_deps_ok() {
  [[ -f node_modules/@radix-ui/react-tooltip/dist/index.mjs ]] \
    && [[ -f node_modules/lodash/_getRawTag.js ]] \
    && [[ -f node_modules/lodash/omit.js ]]
}

install_node_modules() {
  local attempt
  for attempt in 1 2 3; do
    rm -rf node_modules
    if [[ "$attempt" -gt 1 ]]; then
      npm cache verify || true
    fi
    unset NODE_ENV
    npm ci --no-audit --no-fund
    if npm_deps_ok; then
      return 0
    fi
    echo "npm ci incomplete (attempt ${attempt}/3): missing radix-ui or lodash files"
  done
  echo "node_modules still broken after 3 npm ci attempts"
  ls -la node_modules/lodash/ 2>/dev/null | head -20 || true
  exit 1
}

install_node_modules

npm run db:seed
NODE_ENV=production npm run build

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
export NODE_ENV=production

NGINX_SITE="$INSTALL_DIR/deploy/nginx-pumpstatin.conf"
if [[ -f "/etc/letsencrypt/live/83-222-16-200.sslip.io/fullchain.pem" ]] && [[ -f "$INSTALL_DIR/deploy/nginx-pumpstatin-ssl.conf" ]]; then
  NGINX_SITE="$INSTALL_DIR/deploy/nginx-pumpstatin-ssl.conf"
fi
install -m 0644 "$NGINX_SITE" /etc/nginx/sites-available/pumpstatin
ln -sf /etc/nginx/sites-available/pumpstatin /etc/nginx/sites-enabled/pumpstatin
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

systemctl restart pumpstatin-frontend
systemctl --no-pager status pumpstatin-frontend || true
echo "Deploy finished: $(git rev-parse --short HEAD)"
