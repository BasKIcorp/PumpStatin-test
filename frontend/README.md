# Конфигуратор насосных станций

> Web‑приложение для подбора и конфигурирования насосных станций завода (Backend: Django + DRF, Frontend: React/Vite + Node/Express, БД: PostgreSQL)

---

## Содержание

* [Обзор](#обзор)
* [Архитектура](#архитектура)
* [Технологический стек](#технологический-стек)
* [Структура репозитория](#структура-репозитория)
* [Быстрый старт (DEV)](#быстрый-старт-dev)
* [Переменные окружения](#переменные-окружения)
* [Запуск PROD](#запуск-prod)
* [Nginx (reverse proxy + TLS)](#nginx-reverse-proxy--tls)
* [API (основные эндпоинты)](#api-основные-эндпоинты)
* [CI/CD](#cicd)
* [Резервное копирование](#резервное-копирование)
* [Диагностика и частые проблемы](#диагностика-и-частые-проблемы)
* [Лицензия](#лицензия)
* [Контакты](#контакты)

---

## Обзор

Приложение предоставляет REST API для подбора насосов, формирования спецификации и генерации паспорта станции (PDF), а также SPA‑интерфейс для инженеров завода. Проект рассчитан на эксплуатацию на сервере завода (PROD) и локальную разработку (DEV).

---

## Архитектура

```
Пользователь → Nginx (443/80)
   ├─> /           → Node/Express (serveStatic в PROD) → статика Vite
   └─> /api/*      → Node/Express proxy → Django (Gunicorn) → PostgreSQL
```

> В текущей конфигурации приложение (backend/frontend) работает **вне Docker**, а **PostgreSQL** поднимается в Docker Compose.

---

## Технологический стек

* **Backend:** Django, DRF, Gunicorn, drf\_yasg (Swagger)
* **Frontend:** React, Vite, TypeScript, (опц.) Tailwind/shadcn/ui, Recharts
* **БД:** PostgreSQL 14+
* **Интеграции:** Node/Express (proxy к Django, раздача собранной статики)
* **Веб‑сервер:** Nginx (reverse proxy, TLS)
* **CI/CD:** GitHub Actions (SSH‑деплой на VPS)

---

## Структура репозитория

```
repo/
├─ backend/                 # Django (settings, urls, apps, manage.py)
│  ├─ requirements.txt
│  └─ ...
├─ frontend/                # React/Vite приложение
│  ├─ package.json
│  ├─ vite.config.ts
│  └─ ...
├─ docker-compose.yml       # только PostgreSQL (DEV/PROD)
└─ README.md
```

---

## Быстрый старт (DEV)

### 1) База данных (Docker Compose)

Поднимите только PostgreSQL:

```bash
docker compose up -d db
```

По умолчанию БД доступна на `127.0.0.1:5432` (или порт из `.env`).

### 2) Backend (Django)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# применяем миграции и статику
python manage.py migrate
python manage.py collectstatic --noinput
# DEV сервер
python manage.py runserver 127.0.0.1:8000
```

### 3) Frontend (Vite + Node/Express)

```bash
cd frontend
npm ci
# DEV режим (Vite HMR), API будет проксироваться через Express/настройки
npm run dev
```

По умолчанию фронт открыт на `http://localhost:5173` (или порт из Vite), Express‑сервер — `http://localhost:5000` (если используется в DEV).

---

## Переменные окружения

Создайте `.env` для **backend** (расположите рядом с `manage.py`):

```dotenv
# Django
SECRET_KEY=замените_на_секрет
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
TIME_ZONE=Asia/Tashkent

# PostgreSQL (docker-compose db)
POSTGRES_DB=pumpstation
POSTGRES_USER=postgres
POSTGRES_PASSWORD=замените_пароль
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
```

Для **frontend** создайте `.env` (в каталоге `frontend`):

```dotenv
# Базовый URL API. В DEV можно оставить пустым, тогда /api будет относительным
VITE_API_URL=/api
# Порт Express в PROD (если используете собственный сервер выдачи статики)
PORT=5000
NODE_ENV=development
```

> **Безопасность:** не коммитьте `.env` в репозиторий. На PROD используйте менеджер секретов/переменные окружения в systemd.

---

## Запуск PROD

### Backend (Gunicorn + systemd)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
# Gunicorn
gunicorn pump_station_api.wsgi:application -b 127.0.0.1:8000 --workers 3 --timeout 90
```


### Frontend (build + Node/Express)

```bash
cd frontend
npm ci
npm run build
NODE_ENV=production node dist/index.js
```

> В проде Express раздаёт сборку Vite и проксирует `/api` на Django.

---

## Nginx (reverse proxy + TLS)

Минимальная конфигурация (`/etc/nginx/sites-available/pump.conf`):

```nginx
server {
  listen 80;
  server_name example.com;
  return 301 https://$host$request_uri;
}
server {
  listen 443 ssl http2;
  server_name example.com;
  # ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
  # ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

  # Frontend (Node/Express)
  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## API (основные эндпоинты)

* `GET /api/get_matching_pumps` — подбор насосов (query‑параметры: Q, H, n1, nasos\_type, ...)
* `GET /api/download_station_pdf` — генерация и скачивание паспорта станции (PDF)
* `GET /api/get_station_result` — возврат результата расчёта/подбора

> Swagger UI доступен при включённом `drf_yasg` (например, `/swagger`).

---

## CI/CD

В репозитории предусмотрен деплой через **GitHub Actions** (SSH на VPS):

* обновление кода (`git pull`)
* установка зависимостей
* миграции, `collectstatic`
* рестарт `gunicorn`

Необходимы секреты: `SSH_PRIVATE_KEY` (и при необходимости хост/путь пользователя в job‑скрипте).

---

## Резервное копирование

Бэкап PROD БД (пример):

```bash
docker exec -t app-db-1 pg_dump -U postgres pumpstation > /opt/pump_station_api/backup_$(date +%F_%H-%M-%S).sql
```

Восстановление (пример):

```bash
psql -h 127.0.0.1 -U postgres -d pumpstation -f /path/to/backup.sql
```

---

## Диагностика и частые проблемы

| Симптом              | Возможная причина                      | Решение                                                    |
| -------------------- | -------------------------------------- | ---------------------------------------------------------- |
| 502/504 через Nginx  | Не запущен Node/Express или Gunicorn   | Проверить `systemctl status`/логи, перезапустить сервис    |
| 403/CSRF в Django    | Домены не в `ALLOWED_HOSTS`/CORS       | Добавить домены в `.env`, перезапустить                    |
| Нет PDF              | Нет зависимостей/неверные параметры    | Проверить логи, зависимости, корректность query‑параметров |
| Нет подключения к БД | Неверные `POSTGRES_*` или порт/фаервол | Проверить `.env`, доступность `127.0.0.1:5432`             |

---

## Лицензия

Укажите условия лицензирования (например, Proprietary / MIT / Apache‑2.0).

---

## Контакты

* E‑mail: [support@company.tld](mailto:support@company.tld)
* Телефон: +998 XX XXX‑XX‑XX
* Часы: 9:00–18:00, пн‑пт
