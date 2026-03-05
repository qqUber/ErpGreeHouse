# E2E Testing with Docker

## Quick Start

### Option 1: Full Docker (Recommended)

```bash
# Build and run everything in Docker
docker-compose -f docker-compose.e2e.yml up --build --abort-on-container-exit

# Screenshots will be in ./screenshots/
```

### Option 2: Hybrid (Host + Docker)

Run backend/frontend on host, tests in Docker:

```bash
# Terminal 1: Start backend
cd middleware
pip install -r requirements.txt
E2E_TEST_MODE=true E2E_ADMIN_SECRET=test-secret-key python -m uvicorn app.main:app --port 8000

# Terminal 2: Start frontend
cd admin-ui
npm install
npm run dev -- --port 5173

# Terminal 3: Seed data
curl -X POST http://localhost:8000/api/v1/test/seed \
  -H "x-admin-secret: test-secret-key"

# Terminal 4: Run E2E tests in Docker
docker run --rm --network host \
  -v $(pwd)/admin-ui:/app \
  -v $(pwd)/screenshots:/app/screenshots \
  -e E2E_BASE_URL=http://localhost:5173 \
  -e E2E_API_BASE_URL=http://localhost:8000 \
  mcr.microsoft.com/playwright:v1.58.2-jammy \
  bash -c "cd /app && npm install && npx playwright install && npm run test:e2e:smoke"
```

### Option 3: Native (No Docker)

```bash
# Install dependencies
cd middleware && pip install -r requirements.txt
cd admin-ui && npm install

# Start backend (background)
E2E_TEST_MODE=true python -m uvicorn app.main:app --port 8000 &

# Start frontend (background)
npm run dev -- --port 5173 &

# Wait for services
sleep 5

# Seed data
curl -X POST http://localhost:8000/api/v1/test/seed \
  -H "x-admin-secret: test-secret-key"

# Run tests
npm run test:e2e:smoke

# Cleanup
pkill -f uvicorn
pkill -f "npm run dev"
```

## Data Seeding

The seed endpoint creates:
- 20 customers with Russian names
- 15 products (coffee, drinks, food)
- 150+ transactions

```bash
curl -X POST http://localhost:8000/api/v1/test/seed \
  -H "x-admin-secret: test-secret-key"
```

## Screenshots

To capture screenshots with real data:

```bash
# Login and capture
npx playwright screenshot http://localhost:5173/ login.png --full-page

# After login, capture each page:
for page in dashboard customers products analytics loyalty integrations settings; do
  npx playwright screenshot "http://localhost:5173/$page" "${page}.png" --full-page
done
```

## Test Credentials

- **Admin**: admin / admin (owner)
- **Manager**: manager / manager (marketer)
- **Operator**: operator / operator

## Troubleshooting

### Port already in use
```bash
# Kill processes on port 8000
lsof -ti:8000 | xargs kill -9

# Kill processes on port 5173
lsof -ti:5173 | xargs kill -9
```

### Database locked
```bash
# Remove SQLite database
rm middleware/app.db
```

### Tests fail with "Method Not Allowed"
Make sure `E2E_TEST_MODE=true` is set when starting the backend.
