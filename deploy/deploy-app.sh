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

# Чистая установка: на VPS иначе периодически битые node_modules (ENOENT в @radix-ui и др.)
rm -rf node_modules
unset NODE_ENV
npm ci --no-audit --no-fund

for pkg in @radix-ui/react-tooltip wouter regexparam; do
  if [[ "$pkg" == @* ]]; then
    path="node_modules/${pkg}/dist/index.mjs"
  else
    path="node_modules/${pkg}/package.json"
  fi
  if [[ ! -f "$path" ]]; then
    echo "Missing dependency file: $path — retrying npm ci"
    rm -rf node_modules
    npm ci --no-audit --no-fund
    break
  fi
done

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
