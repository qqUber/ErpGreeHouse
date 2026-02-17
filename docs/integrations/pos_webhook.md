# POS Webhook (приём чеков с кассы)

## Назначение

Интеграция `pos_webhook` принимает данные о чеке от кассового ПО/оборудования и создаёт транзакцию CRM с привязкой к клиенту.

## Создание интеграции

В админ-панели: раздел «Интеграции» → «Новая»
- Тип: `pos_webhook`
- После сохранения система выдаёт:
  - URL приёма
  - ключ (секрет) для заголовка

## Endpoint

- Method: `POST`
- URL: `/api/v1/public/integrations/{integration_id}/pos/receipt`
- Header: `x-integration-secret: <secret>`

## Payload

```json
{
  "receipt_id": "R-100",
  "occurred_at": "2026-02-17 10:00:00",
  "total_amount": 400,
  "bonus_used": 0,
  "bonus_earned": 40,
  "customer": {
    "phone": "+79991234567",
    "qr_token": null,
    "telegram_id": null
  },
  "items": [
    {"code": "COFFEE", "name": "Капучино", "price": 200, "qty": 2}
  ]
}
```

### Привязка клиента

Приоритет идентификации:
1) `customer.qr_token`
2) `customer.phone`
3) `customer.telegram_id`
4) иначе создаётся новый клиент

### Идемпотентность

Если чек с `receipt_id` уже обработан — возвращается успешный ответ с `duplicate=true`.

## События

После успешной обработки публикуются события:
- `pos.receipt.ingested`
- `transaction.created`

Эти события могут быть доставлены во внешние системы через интеграции `outbound_webhook`.
