# Report Manager

Turborepo monorepo: генерация отчётов (PDF, XLSX) с асинхронной обработкой и SSE-статусами.

## Быстрый старт (Docker Compose)

Запуск всего стека одной командой:

```bash
# 1. Миграции БД (один раз, после первого запуска postgres)
docker-compose up -d postgres redis minio
yarn migration:run
# или: cd apps/backend && yarn migration:run

# 2. Запуск всех сервисов
docker-compose up -d

# 3. Открыть в браузере
# http://localhost — фронтенд
# http://localhost:3000 — API
# http://localhost:9001 — MinIO Console (создать bucket "reports" при первом запуске)
```

---

## Пошаговый запуск (локальная разработка)

### Этап 1. Инфраструктура (Docker)

```bash
docker-compose up -d postgres redis minio
```

Запускает:
- **PostgreSQL** (5432) — БД
- **Redis** (6379) — pub/sub статусов
- **MinIO** (9000 API, 9001 UI) — S3-совместимое хранилище

### Этап 2. Зависимости

```bash
yarn install
```

### Этап 3. Миграции БД

```bash
yarn migration:run
```

Генерация новой миграции по изменениям в entity (из папки backend):

```bash
cd apps/backend
npm run migration:generate --name=AddNewColumn
```

Откат последней миграции:

```bash
yarn migration:revert
```

### Этап 4. Конфигурация

Вся конфигурация — в `apps/backend/config/config.yml`. Проверьте:

- `services.database` — host, port, password (должны совпадать с postgres)
- `services.redis` — host, port, password (должны совпадать с redis)
- `services.s3` — endpoint, accessKey, secretKey (должны совпадать с MinIO)

Для MinIO: `.env` с `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (опционально, для docker-compose). Backend читает только `config.yml`.

### Этап 5. Сборка

```bash
yarn build
```

### Этап 6. Запуск backend и frontend

```bash
yarn dev
```

Запускает backend (порт 3000) и frontend (порт 5173) параллельно.

### Этап 7. Запуск по отдельности

Backend:

```bash
cd apps/backend && yarn start:dev
```

Frontend:

```bash
cd apps/frontend && yarn dev
```

Frontend проксирует `/api` на `http://localhost:3000`.

---

## Структура проекта

```
report-manager/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── config/       # config.yml, config.docker.yml
│   │   ├── data/report_templates/  # JSON-шаблоны
│   │   └── src/
│   └── frontend/         # React + Vite
├── Architecture.md       # Архитектура, как добавить отчёт
├── docker-compose.yml
└── package.json
```

---

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /reports/types | Список типов отчётов |
| POST | /reports/generate | Запуск генерации `{ type, format }` |
| GET | /reports/:id/stream | SSE-поток статуса |
| GET | /reports/:id/status | Текущий статус |
| GET | /reports/:id/download-url | Presigned URL для скачивания |
| GET | /reports | Список всех отчётов |

---

## Типы отчётов

| Тип | Формат | Описание |
|-----|--------|----------|
| medical-stats | pdf | Медицинская статистика |
| financial | pdf | Финансовый отчёт |
| patient-registry | xlsx | Реестр пациентов |
| procedure-analytics | xlsx | Аналитика по процедурам |

---

## Docker

### Сервисы

- **postgres**: PostgreSQL 16
- **redis**: Redis 7
- **minio**: MinIO (S3)
- **backend**: NestJS API (порт 3000)
- **frontend**: Nginx + статика (порт 80)

### Переменные окружения (docker-compose)

Только для контейнеров MinIO и Redis:

- `REDIS_PASSWORD` — пароль Redis
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` — креды MinIO

Backend читает конфигурацию из `config/config.yml` (в Docker используется `config.docker.yml` с hostname = имя сервиса). Для presigned URL скачивания используется `s3.publicEndpoint: http://localhost:9000` — ссылки формируются для доступа из браузера клиента.
