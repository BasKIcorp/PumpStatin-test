#!/bin/bash
set -eu

APP_ROOT=/opt/pumpstation-base
cd "$APP_ROOT"

echo "==> System fonts for PDF (Cyrillic)"
apt-get install -y -qq fonts-dejavu-core 2>/dev/null || true

echo "==> Python venv + API deps"
cd apps/api
python3 -m venv .venv
.venv/bin/pip install -U pip wheel
.venv/bin/pip install -e .

echo "==> Frontend build"
cd "$APP_ROOT"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack enable
corepack prepare pnpm@9.15.0 --activate
export VITE_API_BASE_URL=
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
pnpm --filter @pumpstation/web build

echo "==> systemd"
cp deploy/pumpstation-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable pumpstation-api
systemctl restart pumpstation-api

echo "==> nginx"
cp deploy/nginx-pumpstatin.conf /etc/nginx/sites-available/pumpstatin
nginx -t
systemctl reload nginx

if systemctl is-active --quiet pumpstatin-frontend 2>/dev/null; then
  systemctl stop pumpstatin-frontend
  systemctl disable pumpstatin-frontend
fi

echo "==> Smoke test"
attempt=1
max_attempts=5
while ! python3 deploy/smoke_test.py; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Smoke test failed after ${max_attempts} attempts"
    exit 1
  fi
  echo "Smoke test attempt ${attempt} failed, waiting for API..."
  attempt=$((attempt + 1))
  sleep 4
  systemctl restart pumpstation-api || true
done

echo "==> Done"
