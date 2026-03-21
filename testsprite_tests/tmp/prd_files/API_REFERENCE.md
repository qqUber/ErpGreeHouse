# API Reference - ErpGreeHouse

> **Complete API documentation for Telegram CRM Middleware and Admin UI**

---

## Overview

The ErpGreeHouse system provides a comprehensive REST API for customer relationship management, Telegram bot integration, and administrative operations. The API is built with FastAPI and follows RESTful principles.

**Base URL**: `http://localhost:8000` (development)  
**API Version**: `v1`  
**Content-Type**: `application/json`

---

## Authentication

### JWT Authentication

Most endpoints require JWT authentication. The system uses access tokens and refresh tokens for secure API access.

#### Headers
```http
Authorization: Bearer <access_token>
Cookie: access_token=<token>; refresh_token=<token>
```

#### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | Login with credentials |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Logout and blacklist tokens |
| `POST` | `/api/v1/public/auth/recover` | Password recovery (admin only) |

---

## Core API Endpoints

### 1. Admin API

#### Authentication Required

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/me` | Get current admin user info |
| `GET` | `/api/v1/admin/users` | List admin users |
| `POST` | `/api/v1/admin/users` | Create admin user |
| `PUT` | `/api/v1/admin/users/{id}` | Update admin user |
| `DELETE` | `/api/v1/admin/users/{id}` | Delete admin user |

#### Key-based Authentication (Development)

| Method | Endpoint | Header | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/v1/admin/*` | `x-admin-secret: <ADMIN_SECRET>` | Access with admin secret |

---

### 2. Products API

#### Product Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `GET` | `/api/v1/products` | List products (with search) | Yes |
| `POST` | `/api/v1/products` | Create new product | Yes |
| `PUT` | `/api/v1/products/{id}` | Update product | Yes |
| `POST` | `/api/v1/products/{id}/archive` | Archive product | Yes |
| `DELETE` | `/api/v1/products/{id}` | Delete product | Yes |

#### Product Import

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `POST` | `/api/v1/products/import/file` | Import from Excel/CSV file | Yes |
| `POST` | `/api/v1/products/import/url` | Import from URL | Yes |
| `GET` | `/api/v1/products/import/preview` | Preview import data | Yes |
| `POST` | `/api/v1/products/import` | Legacy import endpoint | Yes |

---

### 3. Marketing API

#### Customer Segments

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `GET` | `/api/v1/marketing/segments` | List customer segments | Yes |
| `POST` | `/api/v1/marketing/segments` | Create segment | Yes |
| `GET` | `/api/v1/marketing/segments/{id}/preview` | Preview segment customers | Yes |
| `POST` | `/api/v1/marketing/segments/{id}/refresh` | Refresh segment data | Yes |
| `DELETE` | `/api/v1/marketing/segments/{id}` | Delete segment | Yes |

#### Campaigns

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `GET` | `/api/v1/marketing/campaigns` | List campaigns | Yes |
| `POST` | `/api/v1/marketing/campaigns` | Create campaign | Yes |
| `POST` | `/api/v1/marketing/campaigns/{id}/send` | Send campaign | Yes |

#### Triggers & Automation

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `GET` | `/api/v1/marketing/triggers` | List marketing triggers | Yes |
| `POST` | `/api/v1/marketing/triggers` | Create trigger | Yes |

#### Analytics

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `GET` | `/api/v1/marketing/analytics/campaign/{id}` | Campaign analytics | Yes |
| `GET` | `/api/v1/marketing/analytics/events` | Events breakdown | Yes |
| `GET` | `/api/v1/marketing/rate-limit/status` | Rate limiting status | Yes |

---

### 4. Integrations API

#### External Integrations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `GET` | `/api/v1/integrations` | List all integrations | Yes |
| `POST` | `/api/v1/integrations` | Create integration | Yes |
| `PUT` | `/api/v1/integrations/{id}` | Update integration | Yes |
| `DELETE` | `/api/v1/integrations/{id}` | Delete integration | Yes |

---

### 5. Telegram Bot API (TMA)

#### Telegram Mini App Integration

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `POST` | `/api/v1/tma/me` | Get user info from TMA data | No |

---

### 6. Test API (Development Only)

#### Testing Utilities

| Method | Endpoint | Header | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/v1/test/ping` | `x-admin-secret` | Health check |
| `GET` | `/api/v1/test/credentials` | `x-admin-secret` | Get test credentials |
| `POST` | `/api/v1/test/bootstrap` | `x-admin-secret` | Bootstrap test data |
| `POST` | `/api/v1/test/reset` | `x-admin-secret` | Reset test database |
| `GET` | `/api/v1/test/customer_by_phone` | `x-admin-secret` | Get customer by phone |
| `GET` | `/api/v1/test/product_by_code` | `x-admin-secret` | Get product by code |
| `GET` | `/api/v1/test/transactions_by_customer` | `x-admin-secret` | Get customer transactions |
| `POST` | `/api/v1/test/cleanup` | `x-admin-secret` | Cleanup test data |
| `POST` | `/api/v1/test/seed` | `x-admin-secret` | Seed test data |

---

## Public Endpoints (No Authentication)

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Application health |
| `GET` | `/health/db` | Database health |
| `GET` | `/health/redis` | Redis health |
| `GET` | `/health/erp` | ERP integration health |

### Static Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serve Admin UI (index.html) |
| `GET` | `/static/*` | Static assets |

---

## Data Models

### Product Model

```json
{
  "id": 1,
  "name": "Product Name",
  "code": "PROD001",
  "price": 99.99,
  "active": true,
  "created_at": "2026-03-13T10:00:00Z",
  "updated_at": "2026-03-13T10:00:00Z"
}
```

### Customer Segment Model

```json
{
  "id": 1,
  "name": "VIP Customers",
  "criteria": {
    "total_spent_gt": 1000,
    "orders_gt": 10
  },
  "created_at": "2026-03-13T10:00:00Z"
}
```

### Campaign Model

```json
{
  "id": 1,
  "name": "Spring Sale",
  "segment_id": 1,
  "message": "Special offer for VIP customers!",
  "status": "draft",
  "created_at": "2026-03-13T10:00:00Z"
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "detail": "Error description",
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2026-03-13T10:00:00Z"
}
```

### Common HTTP Status Codes

| Status | Description |
|--------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `422` | Validation Error |
| `500` | Internal Server Error |

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default**: 60 requests per minute per IP
- **Authenticated users**: 100 requests per minute
- **Admin users**: 1000 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1647225600
```

---

## CORS Configuration

The API supports Cross-Origin Resource Sharing for frontend integration:

**Development**: `http://localhost:5173`  
**Production**: Configured via `CORS_ORIGINS` environment variable

---

## API Documentation

### Interactive Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### OpenAPI Specification

- **Raw Spec**: `http://localhost:8000/openapi.json`

---

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:8000/health

# Login (get JWT token)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# Access protected endpoint
curl -X GET http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer <token>"
```

### Using HTTPie

```bash
# Health check
http GET localhost:8000/health

# Login
http POST localhost:8000/api/v1/auth/login \
  username=admin password=admin

# List products
http GET localhost:8000/api/v1/products \
  Authorization:"Bearer <token>"
```

---

## Development Notes

### Mock Mode

In development, the API can run in mock mode (`ERP_MOCK_MODE=true`) to provide sample data without real ERP integration.

### Test Endpoints

Development-only test endpoints are available under `/api/v1/test/` with admin secret authentication.

### Environment Variables

Key environment variables affecting API behavior:

- `DEBUG_MODE`: Enable debug logging and error details
- `ERP_MOCK_MODE`: Use mock ERP responses
- `ENABLE_RATE_LIMITING`: Enable/disable rate limiting
- `JWT_SECRET_KEY`: Secret for JWT token signing

---

**Last Updated**: March 13, 2026  
**API Version**: v1  
**Backend Version**: FastAPI 0.135.1
