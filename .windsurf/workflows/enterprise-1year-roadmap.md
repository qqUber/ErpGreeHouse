---
description: 1-Year Enterprise Roadmap — SLA 99.99% Production Readiness for Coffee Shop CRM
auto_execution_mode: 3
---

# Coffee Shop CRM — 1-Year Enterprise Production Roadmap

## SUPER GOAL

> **Every current function works like an enterprise product in PROD with SLA 99.99%
> stability, and clients love using it.**

SLA 99.99% = max **52.6 minutes** downtime/year = max **4.38 minutes**/month.

**Team**: 3 Senior Developers + 1 TechLead | **Duration**: 12 months, 2-week sprints

---

## Current Architecture — Critical Enterprise Gaps

| # | Gap | Severity | Why It Blocks 99.99% |
|---|---|---|---|
| 1 | **SQLite as production DB** | CRITICAL | Single-writer lock, no pooling, no replication, no PITR, file corruption risk |
| 2 | **DB migrations in `connect()`** | CRITICAL | 40+ ALTER TABLE per connection — race conditions, no schema versioning |
| 3 | **No observability** | CRITICAL | No metrics, no tracing, no alerting — can't detect SLA breach |
| 4 | **Single-container Docker Compose** | MAJOR | No HA, no zero-downtime deploy, no auto-scaling |
| 5 | **No DB backups** | MAJOR | Total data loss on host failure |
| 6 | **438 inline styles, 282 !important** | MAJOR | Broken dark mode, no responsive 2K/4K |
| 7 | **293 hardcoded Cyrillic strings** | MAJOR | i18n incomplete — non-RU clients see broken UI |
| 8 | **Hardcoded `money()` ru-RU locale** | MODERATE | Currency formatting wrong for non-RU |
| 9 | **`api.ts` monolith (1213 lines)** | MODERATE | Maintenance burden |
| 10 | **No graceful degradation** | MODERATE | Redis down = 503 instead of degraded |
| 11 | **Russian error messages in backend** | MODERATE | `middlewares.py` returns Russian to EN/SRB clients |
| 12 | **No rate limiting on data endpoints** | MODERATE | DDoS risk on `/customers`, `/dashboard` |

---

## PHASE 1 — FOUNDATION (Months 1-2)

### Goal: Eliminate two biggest SLA risks — SQLite and no observability

#### Sprint 1-2: PostgreSQL Migration
- **Dev-A**: Add SQLAlchemy ORM + Alembic migrations for all 20 tables
  - Replace `db.py` connect() hack (40+ ALTER TABLE) with proper Alembic
  - Add PostgreSQL 16 to `docker-compose.prod.yml` with health checks
  - Write SQLite → PostgreSQL data migration script
  - Implement connection pooling (`pool_size=10, max_overflow=20`)
- **Dev-B**: CSS foundation — merge `index.css`, add 2K/4K breakpoints, extend `useViewportMode` to 6 modes
- **Dev-C**: Add `structlog` JSON logging + Prometheus `/metrics` endpoint + request tracing middleware

#### Sprint 3-4: Observability + i18n + Visual Regression
- **Dev-A**: Grafana + Prometheus stack, alert rules (error rate >1%, P99 >2s, health failure, pool exhaustion), graceful Redis degradation, automated `pg_dump` backups every 6h + PITR
- **Dev-B**: Eliminate inline styles in `App.tsx` (131→<20), `IntegrationSettings.tsx` (85→0), `AnalyticsView.tsx` (71→0); implement fluid `clamp()` typography; create 40 visual regression baselines (5 resolutions × 8 pages)
- **Dev-C**: Complete i18n (293 Cyrillic→0), fix `money()` locale, fix Russian backend error messages to error codes, add i18n CI completeness gate

**Phase 1 Exit:**
- [ ] PostgreSQL sole production DB with Alembic migrations
- [ ] Connection pooling + monitoring
- [ ] JSON structured logging + Prometheus + Grafana dashboards + alerts
- [ ] Automated DB backups + PITR
- [ ] Deep health checks (`/health/live`, `/health/ready`, `/health/deep`)
- [ ] Inline styles: 438→<30, `!important`: 282→<50, Cyrillic: 293→0
- [ ] Fluid typography + 6 viewport modes + 40 visual regression baselines
- [ ] i18n: 100% key parity en/ru/srb

---

## PHASE 2 — RELIABILITY & SECURITY (Months 3-4)

### Goal: Zero-downtime deploys, security audit, error budget tracking

#### Sprint 5-6: Zero-Downtime + SLO Framework
- **Dev-A**: Blue-green deployment via Traefik reverse proxy with TLS, rolling Alembic migrations (backward-compatible only)
  - Define SLOs: Availability 99.99%, P95 <500ms, P99 <2s, Error rate <0.1%
  - Error budget Grafana panel (monthly 4.38 min budget, alert at 50%)
  - Circuit breakers for ERPNext, Telegram, VK APIs (5 failures/30s → open 60s)
- **Dev-B**: Mobile UX polish (touch targets ≥44px, sticky-column tables, fullscreen mobile modals), dark mode comprehensive audit (+40 dark screenshots = 80 total), 4K grid polish
- **Dev-C**: Security headers (CSP, HSTS, X-Frame-Options), CSRF protection, audit logging for admin actions, split `api.ts` into focused modules, add Zod runtime validation

#### Sprint 7-8: Load Testing + Security Audit
- **Dev-A**: Load testing with k6 (target: 200 req/s, P95 <500ms), optimize slow queries (EXPLAIN ANALYZE), add composite indexes, implement query caching for analytics, DB encryption at rest + TLS connections
- **Dev-B**: `React.lazy()` code-splitting, `React.memo()` for widget grid, bundle <500KB gzipped, Lighthouse Performance ≥90, Accessibility ≥90 (WCAG 2.1 AA), deprecate `theme.ts` → CSS vars only
- **Dev-C**: Rate limiting on all endpoints (not just auth), request deduplication, slow query logging (>500ms), input validation strict mode, dependency security audit (Dependabot + `pip-audit`), penetration test preparation

**Phase 2 Exit:**
- [ ] Zero-downtime deployment tested and documented
- [ ] Traefik with TLS termination
- [ ] SLOs defined + error budget dashboard
- [ ] Circuit breakers for all external services
- [ ] Dark mode: 0 bugs (80 screenshots)
- [ ] Load test: 200 req/s, P95 <500ms
- [ ] Bundle <500KB, Lighthouse Perf ≥90, A11y ≥90
- [ ] Security headers + audit logging + CSRF
- [ ] Rate limiting on all API endpoints

---

## PHASE 3 — SCALE & HIGH AVAILABILITY (Months 5-6)

### Goal: Horizontal scaling, multi-replica, auto-recovery

#### Sprint 9-10: Container Orchestration
- **Dev-A**: Migrate from Docker Compose to **Docker Swarm** or **K3s** (lightweight Kubernetes):
  - Backend: 2+ replicas with readiness probes
  - Worker: 2+ replicas with queue partitioning
  - Redis: Sentinel or Redis Cluster for HA
  - PostgreSQL: Read replica for analytics queries
  - Auto-restart on crash, resource limits
- **Dev-B**: Implement **WebSocket** for real-time dashboard updates (SSE fallback):
  - Live customer activity feed
  - Real-time sale notifications
  - Widget auto-refresh without polling
- **Dev-C**: Implement **distributed session management**:
  - JWT tokens stored in Redis (revocation list)
  - Session affinity not required (stateless backend)
  - Token rotation with grace period

#### Sprint 11-12: Data Layer Hardening
- **Dev-A**: PostgreSQL HA:
  - Streaming replication to hot standby
  - Automatic failover (pg_auto_failover or Patroni)
  - Connection routing: writes → primary, reads → replica
  - Test failover scenario: primary dies → standby promotes in <30s
- **Dev-B**: Frontend **offline-first** capabilities:
  - Service worker for static asset caching
  - IndexedDB cache for recent customer/product data
  - Graceful offline banner with auto-reconnect
- **Dev-C**: **API contract testing**:
  - Generate TypeScript types from OpenAPI spec
  - Consumer-driven contract tests (frontend → backend)
  - Break-the-build on API contract violation

**Phase 3 Exit:**
- [ ] 2+ backend replicas with load balancing
- [ ] 2+ worker replicas
- [ ] Redis HA (Sentinel/Cluster)
- [ ] PostgreSQL primary + read replica
- [ ] Automatic failover tested (<30s recovery)
- [ ] WebSocket real-time dashboard updates
- [ ] Stateless backend (JWT + Redis revocation)
- [ ] Offline-first PWA capabilities
- [ ] API contract tests in CI

---

## PHASE 4 — CLIENT EXPERIENCE (Months 7-8)

### Goal: Clients love it — UX polish, performance, onboarding

#### Sprint 13-14: UX Excellence
- **Dev-A**: **Database query optimization sprint**:
  - Analyze all N+1 query patterns → batch queries
  - Materialized views for dashboard aggregations
  - Query performance monitoring dashboard
- **Dev-B**: **Design system v2.0**:
  - Component library with Storybook documentation
  - Design tokens exported as CSS vars, JSON, and TypeScript
  - Animation system with Framer Motion (page transitions, micro-interactions)
  - Skeleton loading states for every async data view
- **Dev-C**: **Onboarding & help system**:
  - First-login guided tour (tooltips highlighting key features)
  - Contextual help buttons on complex forms (marketing campaign builder)
  - Keyboard shortcuts for power users (Ctrl+K command palette)

#### Sprint 15-16: Notification System + Client Feedback
- **Dev-A**: **In-app notification center**:
  - WebSocket-pushed notifications for: new customer, sale completed, campaign finished, system alerts
  - Notification preferences (per-user settings)
  - Email digest (daily/weekly summary for managers)
- **Dev-B**: **Advanced responsive patterns**:
  - Responsive data tables with column priority (hide less important columns on smaller screens)
  - Dashboard widget customization (drag-to-reorder, show/hide per user)
  - Print-optimized CSS for receipts and reports
- **Dev-C**: **Client feedback loop**:
  - In-app feedback widget (rate experience, report bugs)
  - Error tracking integration (Sentry or self-hosted GlitchTip)
  - User session recording for UX debugging (optional, privacy-compliant)

**Phase 4 Exit:**
- [ ] Storybook with all components documented
- [ ] Skeleton loading for every async view
- [ ] Animation system (page transitions, micro-interactions)
- [ ] First-login onboarding tour
- [ ] Keyboard shortcuts (Ctrl+K command palette)
- [ ] In-app notification center (WebSocket)
- [ ] Error tracking (Sentry/GlitchTip)
- [ ] Dashboard widget customization per user
- [ ] Print CSS for receipts/reports

---

## PHASE 5 — OPERATIONAL EXCELLENCE (Months 9-10)

### Goal: Runbooks, chaos testing, disaster recovery, compliance

#### Sprint 17-18: Operational Readiness
- **Dev-A**: **Runbook library**:
  - Deployment runbook (step-by-step)
  - Incident response playbook (detect → triage → mitigate → resolve → postmortem)
  - Database recovery runbook (backup restore, failover activation)
  - Scaling runbook (add replicas, increase resources)
  - Rollback runbook (use existing `rollback.yml` workflow — enhance with DB rollback)
- **Dev-B**: **Performance monitoring dashboard for clients**:
  - System status page (public or per-tenant)
  - SLA compliance report (monthly uptime, incident count)
  - Usage analytics (active users, peak hours, feature adoption)
- **Dev-C**: **Chaos testing**:
  - Kill random container → verify auto-restart (<10s)
  - Simulate network partition → verify circuit breakers activate
  - Simulate DB primary failure → verify failover (<30s)
  - Simulate Redis failure → verify graceful degradation
  - Simulate high load (3× normal) → verify auto-scaling / graceful throttling

#### Sprint 19-20: Compliance & Multi-Tenancy Prep
- **Dev-A**: **Data compliance** (152-FZ for Russian market):
  - Data localization verification (DB hosted within borders)
  - PII encryption at application level (phone, email, name)
  - Data retention policy enforcement (auto-purge after configurable period)
  - GDPR-compatible consent management (existing consent system — harden)
  - Audit trail for all PII access
- **Dev-B**: **Theming per client** (multi-brand support):
  - CSS custom properties loaded from backend config per tenant
  - Logo, brand colors, custom domain support
  - White-label capability (remove GreenHouse branding)
- **Dev-C**: **Multi-tenancy database preparation**:
  - Schema-per-tenant isolation in PostgreSQL
  - Tenant-aware middleware (resolve tenant from subdomain or header)
  - Data migration tool for onboarding new tenants

**Phase 5 Exit:**
- [ ] Complete runbook library (5 runbooks)
- [ ] Incident response tested with tabletop exercise
- [ ] Chaos tests passing (container kill, network partition, DB failover, Redis failure)
- [ ] Public status page
- [ ] PII encryption at rest
- [ ] Data retention auto-purge
- [ ] Audit trail for PII access
- [ ] Multi-brand theming capability
- [ ] Multi-tenancy DB schema ready

---

## PHASE 6 — PRODUCTION LAUNCH & SLA VALIDATION (Months 11-12)

### Goal: Prove SLA 99.99% over 60 days of production traffic

#### Sprint 21-22: Staging Mirror
- **Dev-A**: **Production-mirror staging environment**:
  - Full replica of production stack
  - Synthetic traffic generator (simulate real user patterns)
  - 30-day burn-in test measuring actual SLA
  - Log all incidents, calculate error budget consumption
- **Dev-B**: **Final UI/UX polish sprint**:
  - Cross-browser testing (Chrome, Firefox, Safari, Edge)
  - Final visual regression pass: all 80 screenshots (5 res × 8 pages × 2 themes)
  - Performance audit: Lighthouse all 4 categories ≥ 90
  - Accessibility final pass: screen reader testing
- **Dev-C**: **CI/CD hardening**:
  - Branch protection rules (require 2 reviews, all checks pass)
  - Canary deployment (5% traffic → full rollout if healthy)
  - Automated rollback on health check failure within 5 minutes
  - Dependency pinning (exact versions in requirements.txt + package-lock.json)

#### Sprint 23-24: Production Launch + SLA Monitoring
- **Dev-A**: **Go-live checklist**:
  - [ ] All runbooks reviewed and signed off
  - [ ] Backup tested (restore to clean env)
  - [ ] Failover tested (primary → standby)
  - [ ] Monitoring: all dashboards and alerts active
  - [ ] On-call rotation established
  - [ ] Communication channel for incidents (Telegram ops group)
- **Dev-B**: **Client onboarding materials**:
  - User manual (per role: owner, admin, manager, operator)
  - Video tutorials for key workflows
  - FAQ / troubleshooting guide
  - Release notes template for future updates
- **Dev-C**: **Post-launch stability sprint**:
  - Daily SLA dashboard review (first 30 days)
  - Hot-fix protocol for P0/P1 issues
  - Weekly performance report
  - Customer satisfaction survey (NPS after 30 days)

#### Sprint 25-26: SLA Validation + Retrospective
- **All team**: **60-day SLA validation period**:
  - Measure actual uptime over Months 11-12
  - Track every incident: root cause, duration, impact
  - Calculate: actual availability %, P95/P99 latency, error rate
  - Generate SLA compliance report
- **TechLead**: **Year-end retrospective**:
  - What improved (metrics comparison: start vs end)
  - Remaining tech debt inventory
  - Next-year priorities
  - Team performance review

**Phase 6 Exit:**
- [ ] 60-day SLA measurement: ≥ 99.99% availability
- [ ] P95 < 500ms, P99 < 2s (measured)
- [ ] Error rate < 0.1% (measured)
- [ ] 0 data loss incidents
- [ ] On-call rotation active
- [ ] Client onboarding materials complete
- [ ] Customer NPS collected
- [ ] Year-end retrospective completed

---

## Success Metrics — Year Start vs Year End

| Metric | Start (Today) | End (Month 12) |
|---|---|---|
| **Database** | SQLite (single file) | PostgreSQL HA (primary + replica) |
| **Availability** | Unknown | ≥ 99.99% measured |
| **P95 Latency** | Unknown | < 500ms |
| **Throughput** | ~50 req/s (est.) | 200+ req/s |
| **Deployment** | Manual docker-compose | Zero-downtime canary deploy |
| **Recovery Time** | Unknown (manual) | < 30 seconds (auto-failover) |
| **Backup** | None | Every 6h + PITR |
| **Monitoring** | `/health` only | Prometheus + Grafana + alerts |
| **Frontend bundle** | Unknown | < 500KB gzipped |
| **Lighthouse Perf** | Unknown | ≥ 90 |
| **Lighthouse A11y** | Unknown | ≥ 90 |
| **Inline styles** | 438 | < 30 |
| **!important rules** | 282 | < 50 |
| **Hardcoded Cyrillic** | 293 | 0 |
| **i18n coverage** | ~85% | 100% |
| **Viewport modes** | 3 | 6 (mobile→4K) |
| **Visual baselines** | 0 | 80 (light+dark) |
| **Backend tests** | 46 (unit+integration) | 100+ |
| **E2E tests** | 47 specs | 80+ specs |
| **Security** | Basic JWT | Full audit: CSP, HSTS, encryption, audit log |
| **Replicas** | 1 (single container) | 2+ per service |
| **Client satisfaction** | Unknown | NPS measured |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SQLite→PostgreSQL data loss during migration | Medium | Critical | Test migration on staging 3 times before prod cutover |
| Zero-downtime deploy fails on first try | High | High | Test blue-green with synthetic traffic for 2 weeks |
| Load test reveals <100 req/s | Medium | High | Profile early (Sprint 7), optimize incrementally |
| Security audit finds critical vuln | Medium | Critical | Run `security-nightly.yml` weekly, fix before Phase 6 |
| Multi-tenancy adds 2+ months delay | High | Medium | Keep as Phase 5 stretch goal — skip if behind |
| i18n migration breaks E2E selectors | Medium | Medium | All selectors use `data-testid` — never i18n-dependent |
| Dark mode CSS refactor causes regressions | High | Medium | 80 visual regression screenshots catch every diff |
| Team velocity drops mid-year | Medium | High | Monthly TechLead retro, adjust scope per phase |

---

## Role Assignment Summary

| Phase | Dev-A (Backend) | Dev-B (Frontend) | Dev-C (Full-stack) | TechLead |
|---|---|---|---|---|
| **1: Foundation** | PostgreSQL + Alembic | CSS system + inline elimination | Logging + metrics + i18n | Architecture review |
| **2: Reliability** | Zero-downtime + SLOs | Mobile UX + dark mode + perf | Security + API refactor | SLO governance |
| **3: Scale** | K3s/Swarm + DB HA | WebSocket + offline-first | Distributed sessions + contracts | HA validation |
| **4: Client XP** | Query optimization + notifications | Design system v2 + Storybook | Onboarding + error tracking | UX review |
| **5: Ops** | Runbooks + compliance | Status page + multi-brand | Chaos testing + multi-tenancy | Incident mgmt |
| **6: Launch** | Staging mirror + go-live | Final UI polish + docs | CI/CD hardening + rollback | SLA validation |
