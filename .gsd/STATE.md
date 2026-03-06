# ErpGreeHouse - State

## Position
- **Phase:** 15 of 15
- **Milestone:** v3.0 Production
- **Progress:** 0%

## Docker-Only Development
**RULE: All development via Docker - no local machine dependencies**

```powershell
# Start development
docker-compose -f docker-compose.local.yml up -d

# Services:
# - Frontend: http://localhost:5173
# - Backend:  http://localhost:8000
# - Redis:    localhost:6379
```

## Metrics
- **Tests:** 693 total (561 pytest + 132 E2E)
- **Plans:** 34/34 executed
- **Security:** HIGH: 0, MEDIUM: 0, LOW: 5
- **Docs:** 35 files (added accessibility-report.html)

## Tech Stack
- Backend: FastAPI, Python 3.14, SQLite/PostgreSQL, Redis
- Frontend: React 19, Vite 7, TypeScript
- Auth: JWT + refresh tokens
- Channels: Telegram, VK, ERPNext

## Current Focus
v2.1 UI Enhancement complete - ready for v3.0 Production planning

## Completed Plans
- Phase 11: Responsive Design - Analyze and fix responsive design issues
- Phase 12: Visual Consistency - Establish visual consistency with unified design system
- Phase 13: Accessibility - Improve accessibility for all users
- **Phase 14: Professional UI Design Patterns - Completed 2026-03-06**

## Accumulated Context

### Pending Todos

- [ ] Plan v3.0 Production milestone

## Docker Development (Required)

**All work must be done via Docker - no local dependencies**

```powershell
# Start dev environment
docker-compose -f docker-compose.local.yml up -d

# Access services:
# - Frontend: http://localhost:5173
# - Backend:  http://localhost:8000/docs
# - Redis:    localhost:6379
```

See `docs/DOCKER_COMMANDS.md` for full command reference.

## Last Updated
2026-03-06
