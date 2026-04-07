from typing import Any


def list_integration_templates() -> list[dict[str, Any]]:
    return [
        {
            "id": "ru-pos-webhook-generic",
            "region": "RU",
            "name": "Касса РФ: входящий webhook чека",
            "kind": "pos_webhook",
            "description": "Приём данных чека от кассового ПО/оборудования через webhook с привязкой к клиенту.",
            "config": {},
        },
        {
            "id": "ru-outbound-webhook-messenger",
            "region": "RU",
            "name": "События: webhook в внешнюю систему (мессенджер/ESB)",
            "kind": "outbound_webhook",
            "description": "Доставка событий transaction.created/pos.receipt.ingested во внешние сервисы.",
            "config": {
                "url": "https://example.com/webhook",
                "events": ["transaction.created"],
                "headers": {},
            },
        },
        {
            "id": "rs-pos-webhook-generic",
            "region": "RS",
            "name": "Касса Сербия: входящий webhook фискального чека",
            "kind": "pos_webhook",
            "description": "Приём фискальных чеков (Serbia) от POS/ESIR через webhook; идентификация клиента по телефону/QR.",
            "config": {},
        },
        {
            "id": "rs-outbound-webhook-messenger",
            "region": "RS",
            "name": "События: webhook в внешнюю систему (Serbia)",
            "kind": "outbound_webhook",
            "description": "Доставка событий CRM во внешние интеграционные контуры.",
            "config": {
                "url": "https://example.com/webhook",
                "events": ["transaction.created"],
                "headers": {},
            },
        },
    ]
