#!/bin/bash
# First-time setup on Ubuntu VPS: Node 20, nginx, app dir, systemd, deploy hook.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${INSTALL_DIR:-/opt/pumpstatin-test}"
APP_USER="${APP_USER:-root}"
NODE_MAJOR="${NODE_MAJOR:-20}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl nginx ca-certificates

if ! command -v node &>/dev/null || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi

mkdir -p "$INSTALL_DIR"
chown -R "$APP_USER:$APP_USER" "$INSTALL_DIR"

install -m 0644 "$SCRIPT_DIR/nginx-pumpstatin.conf" /etc/nginx/sites-available/pumpstatin
ln -sf /etc/nginx/sites-available/pumpstatin /etc/nginx/sites-enabled/pumpstatin
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

install -m 0644 "$SCRIPT_DIR/pumpstatin-frontend.service" /etc/systemd/system/pumpstatin-frontend.service
systemctl daemon-reload
systemctl enable pumpstatin-frontend

echo "Server base install done. Run deploy/deploy-app.sh to build and start."
