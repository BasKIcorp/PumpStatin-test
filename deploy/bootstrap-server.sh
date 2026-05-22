#!/bin/bash
# One-time bootstrap: GitHub deploy key, clone repo, nginx, systemd, first build.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/pumpstatin-test}"
BRANCH="${BRANCH:-master}"
REPO_URL="${REPO_URL:-git@github.com:BasKIcorp/PumpStatin-test.git}"
DEPLOY_KEY="${DEPLOY_KEY:-/root/.ssh/github_pumpstatin_deploy}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl nginx ca-certificates openssh-client

if ! command -v node &>/dev/null || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

if [[ ! -f "$DEPLOY_KEY" ]]; then
  ssh-keygen -t ed25519 -f "$DEPLOY_KEY" -N "" -C "pumpstatin-deploy@$(hostname)"
  echo "=== Add this deploy key to GitHub repo BasKIcorp/PumpStatin-test (Deploy keys) ==="
  cat "${DEPLOY_KEY}.pub"
  echo "=== Then re-run bootstrap-server.sh ==="
  exit 2
fi

mkdir -p /root/.ssh
chmod 700 /root/.ssh
if ! grep -q "github.com" /root/.ssh/config 2>/dev/null; then
  cat >> /root/.ssh/config << EOF

Host github.com
  HostName github.com
  User git
  IdentityFile $DEPLOY_KEY
  IdentitiesOnly yes
EOF
  chmod 600 /root/.ssh/config
fi

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
chmod +x deploy/*.sh

if [[ ! -f deploy/production.env ]]; then
  cp deploy/production.env.example deploy/production.env
fi

bash deploy/install-server.sh
bash deploy/deploy-app.sh

echo "Bootstrap complete. Site: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
