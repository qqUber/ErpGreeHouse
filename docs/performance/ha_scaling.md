# Высокая доступность и масштабирование (целевая архитектура)

## Цели

- Доступность: 99.9% uptime (≤ ~43 мин простоя/мес)
- Масштабируемость: до 1 500 000 одновременных пользователей (multi-region не исключается)
- Отказоустойчивость: отсутствие SPOF, прогнозируемые деградации

## Наблюдения по текущему MVP

- CRM хранилище: SQLite (подходит для MVP/демо, не подходит для high-load)
- Админ API синхронный, часть кода выполняется в threadpool
- Telegram-обработка через Celery+Redis (хорошая база для асинхронной обработки)
- Добавлен Redis-кэш на горячие read-эндпоинты (/dashboard, /customers)

## Target архитектура (production)

### 1) Edge / входной трафик
- CDN для статических ресурсов UI
- L7 балансировщик (Nginx/Envoy/Traefik) с:
  - health checks
  - rate limiting
  - circuit breakers
  - timeouts

### 2) Приложение (API)
- FastAPI приложение как stateless сервис
- Горизонтальное масштабирование (Kubernetes Deployment + HPA)
- Uvicorn workers: несколько процессов на pod
- Разделение:
  - Public endpoints (status/health)
  - Admin/API endpoints

### 3) Данные (CRM)
- PostgreSQL как Source of Truth:
  - primary + read replicas
  - регулярные бэкапы + PITR
  - пул соединений (PgBouncer)
- Redis Cluster:
  - кэш hot reads
  - rate limiter
  - очереди/сессии

### 4) Асинхронная обработка
- Celery + брокер (Redis/RabbitMQ) с DLQ
- Outbox паттерн для синхронизации в ERPNext
- Идемпотентность записей при ретраях

### 5) Интеграция с ERPNext
- Через gateway слой:
  - нормализация ошибок
  - retries/backoff
  - лимитирование
- Чёткий контракт и журнал синхронизации

## SLO/Observability

- Метрики: RPS, latency p95/p99, error rate, queue depth, DB time, cache hit rate
- Логи: структурированные, корреляционные id
- Tracing: распределённые трейсинг (OpenTelemetry)
- Алертинг: SLO burn rate, ошибки 5xx, рост latency

## Минимальный план, чтобы приблизиться к 1.5M concurrent

1) Вынести UI на CDN/Reverse Proxy (разгрузить API)
2) Перевести CRM на PostgreSQL + индексы
3) Включить aggressive Redis caching и invalidate стратегии
4) Добавить rate limiting и per-endpoint budgets
5) Горизонтально масштабировать API (N pods) + autoscaling
6) Протестировать нагрузку в staging (k6/Locust) с реалистичными профилями

## Риски

- SQLite остаётся узким местом (блокировки записи) — обязателен переход на Postgres для production.
- 1.5M concurrent требует не только масштабирования API, но и масштабирования сети, кеширования, и разделения read/write нагрузок.
