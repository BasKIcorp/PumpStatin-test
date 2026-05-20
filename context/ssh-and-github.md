# SSH, VPS и GitHub

## VPS

| | |
|---|---|
| IP | `83.222.16.200` |
| SSH | `ssh pumpstatin` |
| Сайт (HTTP) | http://83.222.16.200/ |
| Сайт (HTTPS, sslip.io) | https://83-222-16-200.sslip.io/ |
| Каталог | `/opt/pumpstatin-test` |

## GitHub

https://github.com/BasKIcorp/PumpStatin-test — push в `master` → GitHub Actions → `deploy/deploy-app.sh`.

Секреты: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.

## API на сервере

`/opt/pumpstatin-test/deploy/production.env` — `USE_SQLITE=true`, `SQLITE_PATH=/opt/pumpstatin-test/data/app.sqlite`.

SSL: `bash deploy/setup-ssl.sh` → https://83-222-16-200.sslip.io/ (sslip.io + Let's Encrypt).

Админ: `admin@strela.local` / `admin12345`.
