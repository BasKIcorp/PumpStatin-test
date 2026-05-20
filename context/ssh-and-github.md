# SSH, VPS и GitHub

## VPS

| | |
|---|---|
| IP | `83.222.16.200` |
| SSH | `ssh pumpstatin` |
| Сайт | http://83.222.16.200/ |
| Каталог | `/opt/pumpstatin-test` |

## GitHub

https://github.com/BasKIcorp/PumpStatin-test — push в `master` → GitHub Actions → `deploy/deploy-app.sh`.

Секреты: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.

## API на сервере

`/opt/pumpstatin-test/deploy/production.env` — `BACKEND_API_URL`.
