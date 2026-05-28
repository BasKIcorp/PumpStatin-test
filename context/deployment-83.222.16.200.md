# Деплой 83.222.16.200

## SSH

- Host: `83.222.16.200`
- User: `root`
- Key: `C:\Users\KonBas\.ssh\id_ed25519_pumpstatin`

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pumpstatin root@83.222.16.200
```

## Пути на сервере

| Путь | Назначение |
|------|------------|
| `/opt/pumpstation-base` | Текущий проект PumpStation_Base |
| `/opt/pumpstatin-test` | Старый фронт (остановлен) |

## Сервисы

- `pumpstation-api` — uvicorn :8000
- nginx `pumpstatin` — статика `apps/web/dist`, `/api/` → :8000

## URL

- http://83.222.16.200/
- https://83-222-16-200.sslip.io/

## Env

`/opt/pumpstation-base/deploy/production.env`

## Статус (2026-05-27)

Развёрнуто и проверено smoke-тестом:
- Вход / подбор / PDF (ReportLab + кириллица DejaVu)
- Каталоги для select-полей (`/api/v1/catalog/...`)
- nginx → static + `/api/`
- `pumpstatin-frontend` (старый node :5000) остановлен

Полный тест на сервере: `python3 /opt/pumpstation-base/deploy/smoke_test.py`

## Автодеплой (GitHub Actions)

При **push в ветку `base`** репозитория [BasKIcorp/PumpStatin-test](https://github.com/BasKIcorp/PumpStatin-test) запускается workflow `.github/workflows/deploy-base.yml`: архив → `/opt/pumpstation-base` → `deploy/remote-setup.sh`.

### Секреты репозитория (Settings → Secrets → Actions)

| Secret | Значение |
|--------|----------|
| `DEPLOY_HOST` | `83.222.16.200` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | приватный ключ `~/.ssh/id_ed25519_pumpstatin` (полное содержимое файла) |

Проверка: **Actions** → workflow «Deploy base branch» после push.

## Ручное обновление

```powershell
cd c:\projects\PumpStation_Base
tar -czf $env:TEMP\pumpstation-base.tar.gz --exclude=node_modules --exclude=.git --exclude=dist --exclude=.venv .
scp -i $env:USERPROFILE\.ssh\id_ed25519_pumpstatin $env:TEMP\pumpstation-base.tar.gz root@83.222.16.200:/tmp/
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pumpstatin root@83.222.16.200 "tar -xzf /tmp/pumpstation-base.tar.gz -C /opt/pumpstation-base && sed -i 's/\r$//' /opt/pumpstation-base/deploy/*.sh && bash /opt/pumpstation-base/deploy/remote-setup.sh"
```
