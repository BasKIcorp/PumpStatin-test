# SSH, VPS и GitHub (PumpStatin_test)

## VPS production

| | |
|---|---|
| IP | `83.222.16.200` |
| SSH | `ssh pumpstatin` (root, ключ `id_ed25519_pumpstatin`) |
| Сайт | http://83.222.16.200/ |
| Каталог на сервере | `/opt/pumpstatin-test` |
| systemd | `pumpstatin-frontend` (порт 5000) |
| nginx | прокси 80 → 5000 |

Ручной деплой на сервере:

```bash
cd /opt/pumpstatin-test && bash deploy/deploy-app.sh
```

## SSH-ключ (локальный → сервер)

| | |
|---|---|
| Приватный | `C:\Users\KonBas\.ssh\id_ed25519_pumpstatin` |
| Публичный | `C:\Users\KonBas\.ssh\id_ed25519_pumpstatin.pub` |

Deploy key на сервере для `git pull` (GitHub): `/root/.ssh/github_pumpstatin_deploy`

## GitHub-репозиторий

| | |
|---|---|
| URL | https://github.com/BasKIcorp/PumpStatin-test |
| Организация | BasKIcorp |
| Видимость | private |
| Ветка по умолчанию | `master` |
| Remote | `origin` → `git@github.com:BasKIcorp/PumpStatin-test.git` (HTTPS push через gh) |

## Автообновление при push

Workflow `.github/workflows/deploy.yml` — при push в `master` выполняется SSH на VPS и `deploy/deploy-app.sh`.

Секреты репозитория: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.

Переменные окружения на сервере: `/opt/pumpstatin-test/deploy/production.env` (`DJANGO_API_URL` и т.д.).
