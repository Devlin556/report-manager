# Архитектура Report Manager

## 1. Компоненты, потоки данных, границы ответственности

### Обзор

Report Manager — monorepo (Turborepo) с двумя приложениями:
- **Frontend** — React + Vite + Zustand, порт 5173
- **Backend** — NestJS API, порт 3000

Инфраструктура: PostgreSQL, Redis, MinIO (S3-совместимое хранилище).

### Компоненты Backend

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NestJS Backend                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ReportsController          ReportsSseController                          │
│  (REST API)                 (SSE stream)                                 │
│       │                            │                                      │
│       └────────────┬────────────────┘                                      │
│                    ▼                                                       │
│            ReportsService                                                  │
│                    │                                                       │
│       ┌────────────┼────────────┬──────────────────┐                      │
│       ▼            ▼            ▼                  ▼                      │
│  WorkerManager  Templates   ReportData          S3Service                   │
│  (Piscina)      (YAML)      (Mockers)          (MinIO)                     │
│       │            │            │                  │                       │
│       ▼            ▼            ▼                  │                       │
│  pdf.worker   report_templates  mocker/*.ts        │                       │
│  xlsx.worker  /*.json                              │                       │
└─────────────────────────────────────────────────────────────────────────┘
         │              │              │                  │
         ▼              ▼              ▼                  ▼
    [PostgreSQL]    [Redis]      [файлы]            [MinIO]
    (Report)        (статусы)    (шаблоны)           (файлы)
```

### Поток генерации отчёта

1. **Frontend** → `POST /reports/generate` { type, format }
2. **ReportsService** создаёт запись в БД (status: pending), возвращает reportId
3. **ReportWorkerManagerService** асинхронно:
   - обновляет status → processing
   - читает шаблон из `data/report_templates/{type}.json`
   - получает данные из ReportDataService (мокеры)
   - запускает воркер (Piscina): pdf.worker или xlsx.worker
   - загружает результат в MinIO
   - обновляет БД (status: completed, s3Key)
   - публикует статус в Redis
4. **Frontend** подписывается на `GET /reports/stream` (SSE), получает начальный список pending/processing и обновления в реальном времени
5. При status=completed пользователь скачивает по presigned URL

### Границы ответственности

| Компонент | Ответственность |
|-----------|-----------------|
| **ReportsController** | REST API: типы, генерация, статус, список, download-url |
| **ReportsSseController** | SSE-поток статуса (RxJS) |
| **ReportsService** | Оркестрация, делегирование в WorkerManager/Templates/Data |
| **ReportWorkerManagerService** | Очередь задач, Piscina, Redis pub/sub, S3 |
| **ReportTemplatesService** | Чтение JSON-шаблонов из `data/report_templates/` |
| **ReportDataService** | Выдача данных по типу/формату (мокеры) |
| **pdf.worker / xlsx.worker** | Рендер PDF/Excel по шаблону и данным |

### Конфигурация

Вся конфигурация — в `apps/backend/config/config.yml`. Нет dotenv, нет process.env. Обоснование: единый источник правды, предсказуемость, простота деплоя.

---

## 2. Как добавить новый отчёт

### Шаг 1. Создать JSON-шаблон

Файл: `apps/backend/data/report_templates/{reportType}.json`

Имя файла = `reportType`. Формат (`pdf` или `xlsx`) — в поле `format`.

Пример для PDF:

```json
{
  "reportType": "my-report",
  "format": "pdf",
  "modules": [
    { "type": "header", "dataKey": "title", "config": {} },
    { "type": "section", "dataKey": "", "config": { "title": "Раздел" } },
    { "type": "chart", "dataKey": "charts.main", "config": { "chartType": "bar", "title": "График" } },
    { "type": "table", "dataKey": "items", "config": { "columns": ["col1", "col2"] } }
  ]
}
```

Типы модулей: `header`, `section`, `chart`, `table`, `textBlocks`, `sheet` (xlsx).

### Шаг 2. Создать мокер данных

Файл: `apps/backend/src/modules/report-data/mocker/{reportType}.mocker.ts`

```typescript
import { faker } from '@faker-js/faker';

export function mockMyReportData() {
  return {
    title: 'Мой отчёт',
    charts: {
      main: [
        { label: 'A', value: faker.number.int({ min: 10, max: 100 }) },
        { label: 'B', value: faker.number.int({ min: 10, max: 100 }) },
      ],
    },
    items: Array.from({ length: 20 }, () => ({
      col1: faker.lorem.word(),
      col2: faker.number.int({ min: 1, max: 50 }),
    })),
  };
}
```

Структура должна соответствовать `dataKey` в шаблоне (точечная нотация: `charts.main`, `items`).

### Шаг 3. Зарегистрировать мокер

В `apps/backend/src/modules/report-data/report-data.service.ts`:

```typescript
import { mockMyReportData } from './mocker/my-report.mocker';

const MOCKERS: Record<string, Record<string, () => unknown>> = {
  // ...
  'my-report': { pdf: mockMyReportData },
};
```

### Шаг 4. Добавить отображаемое имя (опционально)

В `apps/frontend/src/App.tsx`:

```typescript
const REPORT_NAMES: Record<string, string> = {
  // ...
  'my-report': 'Мой отчёт',
};
```

### Шаг 5. Проверить

- `yarn build` — сборка
- `yarn dev` — запуск
- Выбрать новый тип в UI и сгенерировать отчёт

---

## 3. Обоснование подходов

### Redis для статусов

**Почему:** Простота — Pub/Sub из коробки, минимальная настройка. Мгновенная доставка статусов всем подписчикам SSE. Хранение последнего статуса в key — быстрый `getStatus` без обращения к БД. PSUBSCRIBE позволяет подписаться на обновления всех отчётов одним каналом.

**Альтернативы:** RabbitMQ/Kafka (избыточно для простого pub/sub), PostgreSQL LISTEN/NOTIFY (слабее масштабируется, привязка к БД), in-memory EventEmitter (не работает при нескольких инстансах backend).

### Piscina (worker threads) для генерации

**Почему:** Простота и удобство — готовый пул воркеров с минимальным API. PDF и Excel — CPU-интенсивные операции; вынос в отдельные потоки не блокирует event loop NestJS. Не требует отдельного процесса или сервиса, всё в одном приложении.

**Альтернативы:** BullMQ + отдельные worker-процессы (лучше для масштабирования, но сложнее), child_process (ручное управление пулом), вынос в микросервис (overkill для прототипа).

### NestJS

**Почему:** Удобная структура (модули, DI, декораторы) и быстрая разработка. Встроенная поддержка SSE, RxJS, TypeORM. Чёткое разделение слоёв (controller → service → repository). Хорошая документация и экосистема.

### Radix UI (библиотека компонентов)

**Почему:** Множество готовых примитивов (Select, Dialog, Dropdown и т.д.) с доступностью из коробки. Простота стилизации — headless-подход, полный контроль над внешним видом через Tailwind/CSS. Не тянет тяжёлый UI-фреймворк.

### S3 (MinIO) для хранения отчётов

**Почему:** Стабильность — проверенное решение для объектного хранилища. Presigned URL позволяют скачивать без проксирования через backend. MinIO — S3-совместимый вариант для разработки и self-hosted.

**Альтернативы:** Локальная файловая система (не масштабируется, проблемы при нескольких инстансах), Google Cloud Storage / Azure Blob (облачные аналоги), PostgreSQL BYTEA (плохо для больших файлов).

### RxJS для потоков данных

**Почему:** Значительно удобнее контролировать потоки данных, чем коллбеки. Декларативный стиль: `takeUntil(close$)`, `filter()`, `tap()` явно задают условия завершения и побочные эффекты. Легко комбинировать, тестировать, отменять подписки. Хорошо сочетается с NestJS и SSE.

### SSE для статусов

**Почему:** Один HTTP-запрос, сервер пушит события. Проще WebSocket для однонаправленного потока (сервер → клиент). EventSource в браузере — нативная поддержка, автоматический reconnect. Не требует отдельного протокола.

**Альтернативы:** WebSocket (избыточен для одностороннего потока, сложнее), long polling (неэффективен, задержки), Server-Sent Events over HTTP/2 (то же SSE, но с мультиплексированием).

### config.yml вместо dotenv

**Почему:** Один файл конфигурации, версионируемый в репозитории. Нет зависимости от `.env`, который может отсутствовать или быть перезаписан. Для разных окружений — разные файлы (`config.dev.yml`, `config.prod.yml`) или монтирование в Docker.

### JSON-шаблоны + dataKey

**Почему:** Добавление отчёта — без изменения кода воркеров. Шаблон описывает структуру (модули, колонки, типы графиков). Мокеры дают данные. Связь через `dataKey` (точечная нотация).

### Миграции вместо synchronize

**Почему:** Контролируемые изменения схемы, откат, история. synchronize в production опасен (потеря данных при несовпадении entity и БД).

### Zustand на фронте

**Почему:** Минимализм, без провайдеров. Достаточно для списка отчётов, типов и подписок на SSE.

---

## 4. Что не сделано и планы на будущее

### Авторизация

Не реализована. Планируется в будущем. Причина: демонстрационный прототип решения без необходимости защиты. Для production потребуется JWT/session, привязка отчётов к пользователю, роли.

### Архитектура фронтенда

Хотелось бы сделать нормальную модульную структуру (features, shared components, routing). На данном этапе достаточно одной страницы — усложнение не оправдано.

### Масштабирование генерации

Для production лучше использовать связку **внешний сервис воркеров + RabbitMQ**: отдельные worker-процессы или контейнеры, очередь задач в RabbitMQ, горизонтальное масштабирование. Сейчас Piscina выбрана для демонстрации — всё в одном процессе, минимальная инфраструктура.

### Тесты

Для production необходимо будет написать тесты, по причине сложности генераторов отчетов и возможных edge-кейсов с необычными шаблонами и новыми элементами. Сейчас шаблоны подогнаны под генераторы и необходимости большой в тестах нет
