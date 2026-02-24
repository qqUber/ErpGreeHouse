# Тестирование и Верификация - ERP GreenHouse

**Версия:** 1.0.0  
**Дата:** February 24, 2026  
**Статус:** Активная разработка

---

## 1. Обзор Стратегии Тестирования (Testing Strategy Overview)

Проект ERP GreenHouse использует комплексную стратегию тестирования, включающую несколько уровней:

### Уровни Тестирования

| Уровень | Инструменты | Назначение |
|---------|------------|------------|
| **Unit Tests** | pytest | Тестирование отдельных функций и классов |
| **Integration Tests** | pytest + httpx | Тестирование API эндпоинтов и взаимодействия с БД |
| **E2E Tests** | Playwright | Сквозное тестирование пользовательских сценариев |

### Архитектура Тестирования

```
┌─────────────────────────────────────────────────────────────┐
│                    ERP GreenHouse                           │
├─────────────────────────────────────────────────────────────┤
│  Frontend (admin-ui)         │  Backend (middleware)        │
│  ┌─────────────────┐         │  ┌─────────────────┐          │
│  │   Playwright   │         │  │     pytest      │          │
│  │   E2E Tests    │         │  │ Unit + Integ    │          │
│  └────────┬────────┘         │  └────────┬────────┘          │
│           │                   │           │                   │
│           ▼                   │           ▼                   │
│  ┌─────────────────┐         │  ┌─────────────────┐          │
│  │   Vitest/       │         │  │  Test Database │          │
│  │   Jest  │         │  │  (isolated)    │          │
│  └─────────────────┘         │  └─────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Тестовые Данные

**Учетные данные для тестов:**

> ⚠️ **ВНИМАНИЕ:** Учетные данные настраиваются через переменную `E2E_TEST_MODE=true` в бэкенде. Смотрите `.env` файл для актуальных значений.

---

## 2. Выполнение Backend Тестов (Backend Test Execution)

### Предварительные Требования

```bash
# Установка зависимостей
cd middleware
pip install -r requirements.txt

# Установка тестовых зависимостей
pip install pytest pytest-asyncio pytest-cov pytest-html pytest-mock fakeredis
```

### Команды pytest

#### Основные Команды

```bash
# Запуск всех тестов
pytest

# Запуск с детальным выводом
pytest -v

# Запуск с покрытием кода
pytest --cov=app --cov-report=html

# Запуск с HTML отчетом
pytest --html=report.html --self-contained-html

# Запуск конкретного тестового файла
pytest tests/unit/test_jwt_comprehensive.py

# Запуск тестов с маркером
pytest -m "unit"
pytest -m "integration"
```

#### Запуск по Директориям

```bash
# Только unit тесты
pytest tests/unit/

# Только integration тесты
pytest tests/integration/

# Специфические тесты
pytest tests/integration/test_jwt_integration.py
pytest tests/integration/test_role_access.py
```

#### Отладка

```bash
# Остановиться при первом failures
pytest -x

# Показать локальные переменные при failures
pytest -l

# Запустить только последние N неудавшихся тестов
pytest --lf

# Запуск с профилированием
pytest --profile
```

### Конфигурация pytest

Файл [`middleware/pytest.ini`](middleware/pytest.ini):

```ini
[pytest]
testpaths = tests
norecursedirs = .venv Lib Scripts reports .pytest_cache
asyncio_mode = auto
```

### Переменные Окружения для Тестов

```bash
# Тестовый режим (обязательно для E2E)
E2E_TEST_MODE=true

# Тестовая база данных
DATABASE_URL=mysql://test:test@localhost:3306/erp_test

# Тестовый Redis
REDIS_URL=redis://localhost:6379/15
```

---

## 3. Выполнение Frontend Тестов (Frontend Test Execution)

### Предварительные Требования

```bash
# Установка зависимостей
cd admin-ui
npm install  # или pnpm install

# Установка Playwright браузеров
npx playwright install chromium
```

### Команды npm/pnpm

#### E2E Тесты Playwright

```bash
# Запуск всех E2E тестов
npm run test:e2e
# или
pnpm test:e2e

# Запуск только smoke тестов
npm run test:e2e:smoke

# Запуск только critical тестов
npm run test:e2e:critical

# Запуск в режиме CI
npx playwright test --reporter=html

# Запуск с UI режимом (отладка)
npx playwright test --ui
```

#### Специфические Проекты

```bash
# Запуск определенного проекта из playwright.config.ts
npx playwright test --project=smoke
npx playwright test --project=critical
npx playwright test --project=functional

# Запуск определенного тестового файла
npx playwright test e2e/auth/login-flow-test.spec.ts

# Запуск с параллельными воркерами
npx playwright test --workers=4

# Запуск последовательно (для отладки)
npx playwright test --workers=1
```

#### Линтинг и Проверка Кода

```bash
# Запуск линтера
npm run lint

# Запуск форматера
npm run format

# Проверка (lint + format + import sorting)
npm run check
```

#### Отчетность

```bash
# Генерация Allure отчета
npm run report:allure
```

### Конфигурация Playwright

Файл [`admin-ui/playwright.config.ts`](admin-ui/playwright.config.ts):

```typescript
import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'url';

const uiMode = process.env.E2E_UI_MODE || 'auto';
const isManual = uiMode === 'manual';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000, // Increased for slower CI environments
  expect: { timeout: 20_000 }, // Increased for UI stability
  retries: 1, // Retry failed tests once for stability
  // Global setup runs ONCE before all tests to prepare test data
  globalSetup: fileURLToPath(new URL('./e2e/global-setup.ts', import.meta.url)),
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    headless: !isManual,
    launchOptions: isManual ? { slowMo: Number(process.env.E2E_SLOWMO_MS || 250) } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  maxFailures: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  workers: 1,

  projects: [
    { name: 'smoke', testDir: './e2e/smoke' },
    { name: 'critical', testDir: './e2e/critical' },
    { name: 'functional', testDir: './e2e/functional' },
    { name: 'roles', testDir: './e2e/roles' },
    { name: 'auth', testDir: './e2e/auth' },
  ],
});
```

---

## 4. Конфигурация Тестов (Test Configuration Details)

### Структура Тестов

```
middleware/
├── tests/
│   ├── conftest.py              # Общие fixtures
│   ├── unit/                    # Unit тесты
│   │   ├── test_jwt_comprehensive.py
│   │   ├── test_jwt_security.py
│   │   ├── test_analytics.py
│   │   └── ...
│   └── integration/            # Integration тесты
│       ├── test_jwt_integration.py
│       ├── test_role_access.py
│       └── ...

admin-ui/
├── e2e/                         # E2E тесты
│   ├── smoke/
│   │   └── smoke.spec.ts
│   ├── critical/
│   │   └── critical-flow.spec.ts
│   ├── functional/
│   │   └── mvp-core.spec.ts
│   ├── auth/
│   │   └── login-flow-test.spec.ts
│   └── roles/
│       └── admin-full-flow.spec.ts
```

### Environment Variables

#### Backend (.env)

```bash
# Обязательно для тестов
E2E_TEST_MODE=true

# Опционально
DATABASE_URL=mysql://user:pass@localhost:3306/erp_test
REDIS_URL=redis://localhost:6379/15
JWT_SECRET_KEY=test-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

#### Frontend (.env)

```bash
# API URL
VITE_API_URL=http://localhost:8000

# Тестовый режим
VITE_E2E_MODE=true
```

### Fixtures (conftest.py)

Основные fixtures определены в [`middleware/tests/conftest.py`](middleware/tests/conftest.py):

```python
@pytest.fixture
async def client():
    """HTTP клиент для тестирования"""
    ...

@pytest.fixture
async def auth_token():
    """JWT токен для аутентификации"""
    ...

@pytest.fixture
async def test_db():
    """Изолированная тестовая БД"""
    ...
```

### Тестовые Данные

Тестовые данные находятся в:

- [`tests/fixtures/edge_cases/expired_tokens.json`](tests/fixtures/edge_cases/expired_tokens.json)
- [`tests/fixtures/edge_cases/invalid_data.json`](tests/fixtures/edge_cases/invalid_data.json)

---

## 5. Локальный Запуск Тестов (Running Tests Locally)

### Полный Сценарий

```bash
# 1. Запуск Backend тестов
cd middleware
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov pytest-html
pytest -v --cov=app --cov-report=html

# 2. Запуск Frontend E2E тестов
cd ../admin-ui
npm install
npx playwright install chromium
npm run test:e2e:smoke
```

### Скрипты

Проект содержит готовые скрипты:

- [`middleware/run_tests.sh`](middleware/run_tests.sh) - Linux/Mac
- [`middleware/run_tests.ps1`](middleware/run_tests.ps1) - Windows
- [`scripts/run-e2e-tests.ps1`](scripts/run-e2e-tests.ps1) - E2E тесты

---

## 6. CI/CD Интеграция

Тесты интегрированы в GitHub Actions:

- Автоматический запуск при пуше
- Проверка линтеров (Biome, Ruff)
- Запуск unit и integration тестов
- E2E тесты на Pull Requests

Подробнее в [`docs/ci-cd.md`](docs/ci-cd.md).

---

## 7. Troubleshooting

### Частые Проблемы

| Проблема | Решение |
|----------|---------|
| `E2E_TEST_MODE not enabled` | Установите `E2E_TEST_MODE=true` |
| Database connection failed | Проверьте `DATABASE_URL` |
| Redis connection failed | Запустите Redis или используйте `fakeredis` |
| Playwright timeout | Увеличьте timeout в `playwright.config.ts` |
| JWT token expired | Проверьте `JWT_EXPIRE_MINUTES` |

### Логи

- Backend тесты: `middleware/test-reports/`
- Frontend тесты: `admin-ui/allure-results/`

---

**Документ обновлен:** February 24, 2026

