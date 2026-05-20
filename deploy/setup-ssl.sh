#!/bin/bash
# Бесплатный домен sslip.io → IP и Let's Encrypt SSL (без регистрации домена).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="${SSL_DOMAIN:-83-222-16-200.sslip.io}"
EMAIL="${SSL_EMAIL:-admin@strela.local}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx

mkdir -p /var/www/certbot
install -m 0644 "$SCRIPT_DIR/nginx-pumpstatin.conf" /etc/nginx/sites-available/pumpstatin
ln -sf /etc/nginx/sites-available/pumpstatin /etc/nginx/sites-enabled/pumpstatin
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
  certbot renew --quiet || true
else
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
fi

echo "HTTPS: https://${DOMAIN}/"
echo "HTTP IP: http://83.222.16.200/"
