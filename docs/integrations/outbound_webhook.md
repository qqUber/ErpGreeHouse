# Outbound Webhook (доставка событий во внешние системы)

## Назначение

Интеграция `outbound_webhook` отправляет события CRM во внешние сервисы (в т.ч. коннекторы к мессенджерам, ESB, шины событий).

## Создание интеграции

В админ-панели: раздел «Интеграции» → «Новая»
- Тип: `outbound_webhook`
- Конфигурация (JSON)

## Config JSON

Минимальный пример:

```json
{
  "url": "https://example.com/webhook",
  "events": ["transaction.created"],
  "headers": {
    "Authorization": "Bearer <token>"
  }
}
```

- `url` — обязательный URL назначения
- `events` — список событий. Если не задан, интеграция получает все события
- `headers` — опциональные HTTP заголовки

## Формат отправки

Request:
- Method: `POST`
- Body:

```json
{
  "event_type": "transaction.created",
  "data": {
    "transaction_id": 123,
    "customer_id": 10,
    "total": 400,
    "bonus_used": 0,
    "bonus_earned": 40
  }
}
```

## Логи доставок

Админ-панель отображает последние записи доставки (HTTP статус и время) в разделе «Доставка событий».
