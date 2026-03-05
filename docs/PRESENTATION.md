# Presentation Guide

## Demo Flow

### 1. Login (30 sec)
- URL: http://localhost:5173/
- Credentials: admin/admin
- Features: Login form, password visibility, remember me

### 2. Dashboard (60 sec)
- Key metrics: Total customers, sales, orders
- Quick actions: Register client, process sale, send campaign
- Recent activity feed

### 3. Customers (45 sec)
- Customer list with search/filter
- Customer card preview
- Registration date, loyalty points, last visit
- Action menu: View, edit, delete

### 4. Products (45 sec)
- Product catalog with categories
- Product details: Code, name, price, points
- Import/export CSV
- Quick search

### 5. Analytics (60 sec)
- Sales chart: Last 30 days
- Loyalty points redemption rate
- Product performance
- Customer activity heatmap
- Export reports

### 6. Loyalty Program (45 sec)
- Loyalty tiers: Bronze, Silver, Gold
- Points ratio configuration
- Redemption settings
- Loyalty campaigns

### 7. Integrations (45 sec)
- Telegram bot configuration
- VK integration settings
- ERPNext connection (with mock mode)
- Webhook endpoints

### 8. Settings (30 sec)
- Role management: Admin, Manager, Operator
- Permission boundaries
- System settings
- Backup/restore

---

## Screenshots

Located in `admin-ui/screenshots/`:

| File | Size | Description |
|------|------|-------------|
| login.png | 40 KB | Login form |
| dashboard.png | 5 KB | Main dashboard |
| customers.png | 5 KB | Customer list |
| products.png | 5 KB | Product catalog |
| analytics.png | 40 KB | Charts & metrics |
| loyalty.png | 5 KB | Points program |
| integrations.png | 40 KB | Telegram/VK/ERP |
| settings.png | 5 KB | Admin settings |

---

## Key Features to Highlight

### Security
- JWT authentication with refresh tokens
- Role-based access control
- PBKDF2 password hashing
- Rate limiting

### Compliance
- 152-FZ consent management
- Data retention policies
- User profile deletion

### Performance
- Async architecture (FastAPI)
- Redis caching
- Optimized queries

### Testing
- 561 backend tests
- 132 E2E tests
- Coverage: 39%
