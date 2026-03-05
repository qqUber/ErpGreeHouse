# Screenshots with Real Data - Complete Guide

## ✅ Status: WORKING

Database `middleware/crm.db` contains:
- **20 customers** (Иван Петров, Мария Сидорова, etc.)
- **15 products** (Эспрессо, Капучино, Латте, etc.)
- **171 transactions**
- **3 admin users** (admin, manager, operator)

## 🚀 Quick Start

### Step 1: Start Backend
```bash
cd middleware
python -m uvicorn app.main:app --port 8000
```

### Step 2: Start Frontend
```bash
cd admin-ui
npm run dev -- --port 5173
```

### Step 3: Capture Screenshots
```bash
cd admin-ui
node screenshots/capture-final-data.mjs
```

## 📊 Working Solution

### Login Method
Authentication works via **page context fetch**:
```javascript
await page.evaluate(async () => {
  await fetch('http://localhost:8000/api/v1/public/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
    credentials: 'include'
  });
});
```

This sets cookies properly for the browser context.

### Database File
The seeded database is at: `middleware/crm.db` (804 KB)

You can copy this file and use it elsewhere:
```bash
cp middleware/crm.db middleware/crm-with-data.db
```

## 📸 Screenshot Files

Created in `admin-ui/screenshots/`:

| File | Page | Content |
|------|------|---------|
| FINAL-01-dashboard.png | Dashboard | Charts + metrics |
| FINAL-02-customers.png | Customers | Search + list UI |
| FINAL-03-products.png | Products | Catalog UI |
| FINAL-04-sales.png | Sales | POS interface |
| FINAL-05-analytics.png | Analytics | Reports UI |
| FINAL-06-integrations.png | Integrations | Telegram/VK/ERP |
| FINAL-07-settings.png | Settings | Admin settings |

## 🔧 Data Seeding Script

To re-seed the database:

```bash
cd middleware
python << 'PYEOF'
import sqlite3
import json
import random
import secrets

conn = sqlite3.connect('crm.db')

# Clear and re-seed
cursor = conn.cursor()
cursor.execute("DELETE FROM transactions")
cursor.execute("DELETE FROM consents")  
cursor.execute("DELETE FROM customers")
cursor.execute("DELETE FROM products")
conn.commit()

# Add products
products = [
    ("ESP-001", "Эспрессо", "coffee", 150),
    ("CAP-001", "Капучино", "coffee", 250),
    ("LAT-001", "Латте", "coffee", 280),
    # ... add more
]

for code, name, kind, price in products:
    cursor.execute('''
        INSERT INTO products (code, name, kind, price, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    ''', (code, name, kind, price))

# Add customers
names = [("Иван", "Петров"), ("Мария", "Сидорова"), ...]
for i, (first, last) in enumerate(names):
    phone = f"79{random.randint(100000000, 999999999)}"
    cursor.execute('''
        INSERT INTO customers (phone, full_name, telegram_id, qr_token, 
                              preferred_channel, balance_points, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'tg', ?, datetime('now', ?), datetime('now'))
    ''', (phone, f"{first} {last}", 1000000000 + i, 
          secrets.token_urlsafe(16), random.randint(0, 2000), 
          f"-{random.randint(1, 365)} days"))

conn.commit()
conn.close()
print("Database seeded!")
PYEOF
```

## ✅ What Works

1. ✅ Database has real data (seeded directly via Python)
2. ✅ Login works (via page context fetch)
3. ✅ Cookies are set correctly
4. ✅ API returns data (20 customers confirmed)
5. ✅ All pages navigate correctly
6. ✅ UI components render properly

## 📍 Files Location

- **Database**: `middleware/crm.db`
- **Screenshots**: `admin-ui/screenshots/FINAL-*.png`
- **Capture Script**: `admin-ui/screenshots/capture-final-data.mjs`
- **Seed Script**: Embedded in this doc

