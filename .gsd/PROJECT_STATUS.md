# ErpGreeHouse - Project Status

**Updated:** 2026-03-04

## ✅ Milestones

| Milestone | Status | Phases | Plans | Date |
|-----------|--------|--------|-------|-------|
| v1.0 MVP | ✅ | 0-7 | 27 | 2026-03-03 |
| v1.1 Security | ✅ | 8-9 | 2 | 2026-03-04 |
| v2.0 Redesign | 📋 | 10-12 | - | - |

**Total: 29/29 plans executed**

---

## 🧪 Tests

| Type | Count | Config |
|------|-------|--------|
| pytest (backend) | 561 | pytest.ini |
| Playwright (E2E) | 132 | playwright.config.ts |
| **Total** | **693** | |

---

## 🔒 Security (Phase 8-9)

| Severity | Before | After |
|----------|--------|-------|
| HIGH | 1 | 0 |
| MEDIUM | 20 | 0* |
| LOW | 5 | 5 |

*B608 skipped as false positive

---

## 📚 Docs (31 files)

- Architecture: system_architecture.md, user_flows.md
- Compliance: audit_report.md, data_storage_compliance.md  
- Integrations: telegram-setup.md, vk-setup.md, pos_webhook.md
- Security: checklist.md, zap.md
- Testing: e2e-testing-guide.md, mvp-ui-tests.md

---

## 🏗️ Structure

```
middleware/           # FastAPI backend (31 .py files)
├── app/            # Main application
├── tests/          # 561 tests
└── requirements.txt

admin-ui/           # React frontend (10 .tsx/.ts)
├── src/            # Source code
├── e2e/            # 132 E2E tests
└── package.json
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, Python 3.14 |
| Database | SQLite (dev), PostgreSQL (prod) |
| Cache | Redis |
| Frontend | React 19, Vite 7, TypeScript |
| Auth | JWT + refresh tokens |
| Integrations | Telegram Bot, VK, ERPNext |
| Compliance | 152-FZ (Russian data law) |

---

## 🔧 Quality Tools

- pytest (testing)
- Playwright (E2E)
- bandit (security)
- biome (linting)
- mypy (types)
