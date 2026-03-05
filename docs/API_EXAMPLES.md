# API Examples

## Authentication

### Login (Public)
```bash
curl -X POST "http://localhost:8000/api/v1/public/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }'
```

Response:
```json
{
  "token": "b4OAOlnAHdVwP5ptVeTxifH2PqiH5fMrK29Gd0tAI5w",
  "must_change_password": false
}
```

---

## Products

### List Products
```bash
curl "http://localhost:8000/api/v1/products?page=1&page_size=5" \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "items": [
    {
      "id": 1,
      "code": "PRD-001",
      "name": "Espresso",
      "price": 150,
      "category": "Кофе",
      "points_ratio": 1
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 5
}
```

---

## Customers

### List Customers
```bash
curl "http://localhost:8000/api/v1/customers?page=1&page_size=5" \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "items": [
    {
      "id": 1,
      "phone": "79991234567",
      "full_name": "Иван Петров",
      "balance_points": 1000,
      "created_at": "2024-01-01T00:00:00"
    }
  ],
  "total": 25,
  "page": 1,
  "page_size": 5
}
```

---

## Analytics

### Get Summary
```bash
curl "http://localhost:8000/api/v1/analytics/summary" \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "total_customers": 1500,
  "total_sales": 120000,
  "avg_order_value": 180,
  "loyalty_redemption_rate": 0.15,
  "active_campaigns": 3
}
```

---

## Loyalty

### Get Customer Points History
```bash
curl "http://localhost:8000/api/v1/loyalty/points/history?customer_id=1" \
  -H "Authorization: Bearer <token>"
```

Response:
```json
[
  {
    "date": "2024-01-10",
    "amount": 100,
    "description": "Purchase",
    "balance": 1100
  },
  {
    "date": "2024-01-15",
    "amount": -500,
    "description": "Redemption",
    "balance": 600
  }
]
```

---

## Health Check
```bash
curl "http://localhost:8000/health"
```

Response:
```json
{"status":"ok"}
```
