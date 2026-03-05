# Demo Guide

## Prerequisites
- Python 3.14
- Node.js 20+
- Redis

## 1. Prepare Backend
```bash
cd middleware

# Create virtual env (optional but recommended)
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (copy and edit)
copy .env.example .env
```

## 2. Start Backend (with test mode)
```bash
cd middleware

# Option 1: Quick start with test data
python -m app.main --test-mode

# Option 2: Start with specific port
set E2E_TEST_MODE=true
python -m uvicorn app.main:app --port 8000
```

## 3. Bootstrap Test Data
```bash
# After backend is running, create test users and data
curl -X POST http://localhost:8000/api/v1/test/bootstrap -H "x-admin-secret: test-secret-key"
```

## 4. Start Frontend
```bash
cd admin-ui

# Install dependencies (first time)
npm install

# Start dev server
npm run dev -- --port 5173
```

## 5. Capture Screenshots (for presentations)
```bash
cd admin-ui
npm install -D playwright
npx playwright install

# Login and capture all pages with data
npx playwright screenshot http://localhost:5173/ login.png
npx playwright screenshot http://localhost:5173/dashboard dashboard.png
npx playwright screenshot http://localhost:5173/customers customers.png
npx playwright screenshot http://localhost:5173/products products.png
npx playwright screenshot http://localhost:5173/analytics analytics.png
npx playwright screenshot http://localhost:5173/loyalty loyalty.png
npx playwright screenshot http://localhost:5173/integrations integrations.png
npx playwright screenshot http://localhost:5173/settings settings.png

# Screenshots saved in admin-ui/screenshots/
```

## 6. Run E2E Tests (132 tests)
```bash
cd admin-ui

# Install dependencies
npm install

# Start test servers (in separate terminals)
cd middleware
set E2E_TEST_MODE=true
python -m uvicorn app.main:app --port 8000

cd admin-ui
npm run dev -- --port 5173

# Run tests (third terminal)
cd admin-ui
npm run test:e2e
```

## 7. Run Backend Tests (561 tests)
```bash
cd middleware

# Create virtual env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Run tests
pytest tests/ -v
```

## 8. Test Credentials (for login)
```
Username: admin
Password: admin

Username: manager
Password: manager

Username: operator
Password: operator
```

## 9. API Endpoints
```
# Auth
POST /api/v1/public/auth/login
POST /api/v1/test/bootstrap
GET /health

# Products
GET /api/v1/products?page=1&page_size=5

# Customers
GET /api/v1/customers?page=1&page_size=5

# Analytics
GET /api/v1/analytics/summary
```

## 10. Database Structure
SQLite file at: `middleware/app.db`

Key tables:
- `admin_users` - users and roles
- `customers` - customer profiles
- `products` - product catalog
- `transactions` - purchase history
- `consents` - 152-FZ compliance

## 11. System Features
- **Loyalty Program**: Points calculation, redemption
- **Messaging**: Telegram, VK, trigger-based
- **Compliance**: 152-FZ consent management
- **Analytics**: Real-time dashboards
- **ERP Integration**: ERPNext (with mock mode)

## 12. Tech Stack
- Backend: FastAPI, Python 3.14
- Frontend: React 19, TypeScript, Vite 7
- Database: SQLite (dev), PostgreSQL (prod)
- Cache: Redis
- Auth: JWT + refresh tokens

## 13. Security
- **JWT Authentication**: HS256 with access/refresh tokens
- **Password Hashing**: PBKDF2 with 200,000 iterations
- **Rate Limiting**: 60 requests per minute per user
- **Input Validation**: SQL injection and XSS prevention

## 14. Presentation Material
Located in: `admin-ui/screenshots/`
- login.png - Login screen
- dashboard.png - Main dashboard
- customers.png - Customer management
- products.png - Product catalog
- analytics.png - Analytics dashboard
- loyalty.png - Loyalty program
- integrations.png - Integrations (Telegram/VK/ERP)
- settings.png - System settings
