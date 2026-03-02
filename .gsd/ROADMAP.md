# ErpGreeHouse - Roadmap

## Overview

An omnichannel CRM + Loyalty system for coffee shops, replacing expensive third-party solutions with an open-source alternative. The system will unify customer loyalty management and targeted communications across Telegram, VK, and mobile app channels.

## Phases

### Phase 0: Test Improvement & Stabilization
**Goal**: Improve test coverage and fix existing test failures

**Dependencies**: None

**Requirements**:
- ✅ Fix consent flow test failure
- ✅ Fix database file locking issue
- ✅ Mock Telegram API calls for integration tests
- ✅ Improve test coverage for handlers.py (17% → 39% coverage)
- ✅ Improve test coverage for integrations/bots/shared/commands.py (12% → 97% coverage)
- ✅ Improve test coverage for integrations/bots/vk_handler.py (15% → ~20% coverage)

**Success Criteria**:
1. ✅ All existing test failures are fixed
2. ✅ Test coverage for handlers.py, commands.py, and vk_handler.py is at least 30%
3. ✅ Consent flow, database locking, and Telegram integration tests pass
4. ✅ Full test suite runs without failures

**Plans**: 3 plans

- ✅ 00-01-PLAN.md — Fix critical test failures
- ✅ 00-02-PLAN.md — Improve test coverage
- ✅ 00-03-PLAN.md — Verify integration and run full test suite

---

### Phase 1: Foundation (Core Infrastructure)
**Goal**: Establish the core system infrastructure and basic functionality

**Dependencies**: None

**Requirements**:
- System architecture setup
- Database schema design
- Basic API infrastructure
- Authentication and authorization
- Environment configuration

**Success Criteria**:
1. System can be deployed locally and in production
2. Basic API endpoints are accessible and functional
3. Database connections are established and tested
4. Authentication mechanism works for admin users
5. Environment configuration is properly set up

**Plans**: 4 plans

- [x] 01-01-PLAN.md — Environment setup and dependency installation
- [x] 01-02-PLAN.md — Database initialization and seed data loading
- [x] 01-03-PLAN.md — FastAPI application server setup and endpoint verification
- [x] 01-04-PLAN.md — Test execution and verification

**Status**: Complete
**Completed**: 2026-03-02

---

### Phase 2: Loyalty Program Management
**Goal**: Implement the core loyalty program functionality

**Dependencies**: Phase 1

**Requirements**:
- LOY-001: User can check loyalty points balance via any supported channel
- LOY-002: Loyalty points are automatically accrued based on purchase amount
- LOY-003: Loyalty points can be redeemed for purchases
- LOY-004: Loyalty program data is synchronized across all channels

**Success Criteria**:
1. Users can check their loyalty points balance through all supported channels
2. Loyalty points are automatically calculated and added for each purchase
3. Users can redeem loyalty points for purchases
4. Loyalty program data is consistent across all channels
5. Points calculation and redemption logic is accurate

**Plans**: 4 plans

- [x] 02-01-PLAN.md — Verify core functionality
- [x] 02-02-PLAN.md — Enhance test coverage
- [x] 02-03-PLAN.md — Add missing features
- [x] 02-04-PLAN.md — Verify cross-channel functionality

**Status**: Complete
**Completed**: 2026-03-02

---

### Phase 3: Messaging System
**Goal**: Implement the messaging and communications functionality

**Dependencies**: Phase 2

**Requirements**:
- MSG-001: Send targeted promotional messages to customer segments
- MSG-002: Implement trigger-based messages (birthday, inactivity, welcome)
- MSG-003: Support for text and media messages (images, videos, documents)
- MSG-004: Rate limiting to prevent channel bans
- MSG-005: Track message delivery and open rates

**Success Criteria**:
1. Admin can create and send targeted promotional messages to customer segments
2. Trigger-based messages are automatically sent based on user behavior
3. Support for various message types including text and media
4. Rate limiting is implemented to prevent channel bans
5. Message delivery and open rates are tracked and accessible

**Plans**: 5 plans

- [x] 03-01-PLAN.md — Media message support
- [x] 03-02-PLAN.md — Rate limiting
- [x] 03-03-PLAN.md — Delivery and open rate tracking
- [x] 03-04-PLAN.md — VK integration
- [x] 03-05-PLAN.md — Advanced segmentation and triggers

**Status**: Complete
**Completed**: 2026-03-02

---

### Phase 4: Compliance & Data Protection
**Goal**: Ensure compliance with Russian data protection laws (152-FZ)

**Dependencies**: Phase 3

**Requirements**:
- COMP-001: Explicit consent collection for personal data processing
- COMP-002: Consent records include timestamp and document version
- COMP-003: User can revoke consent and delete profile in 1 click
- COMP-004: All data stored within Russian Federation borders

**Success Criteria**:
1. Users must explicitly consent to personal data processing before using the system
2. Consent records are properly stored with all required information
3. Users can revoke consent and delete their profiles easily
4. All customer data is stored within Russian Federation borders
5. Data protection practices comply with 152-FZ regulations

---

### Phase 5: ERP Integration
**Goal**: Integrate the system with ERPNext for data synchronization

**Dependencies**: Phase 4

**Requirements**:
- ERP-001: Sync customer data with ERPNext
- ERP-002: Import purchase data from ERP for loyalty point calculation
- ERP-003: Export loyalty program data to ERP

**Success Criteria**:
1. Customer data is synchronized between the system and ERPNext
2. Purchase data is imported from ERP for loyalty point calculation
3. Loyalty program data is exported to ERP for reporting
4. Integration is reliable and handles errors gracefully
5. Data sync processes are automated and scheduled

---

### Phase 6: Admin Dashboard
**Goal**: Create the admin management interface

**Dependencies**: Phase 5

**Requirements**:
- ADMIN-001: View and manage customer profiles
- ADMIN-002: Create and manage promotional campaigns
- ADMIN-003: View messaging analytics and reports
- ADMIN-004: Configure loyalty program settings

**Success Criteria**:
1. Admin users can view and manage customer profiles
2. Promotional campaigns can be created and managed through the dashboard
3. Messaging analytics and reports are accessible
4. Loyalty program settings can be configured
5. Dashboard is intuitive and responsive

---

### Phase 7: Testing & Optimization
**Goal**: Test the system and optimize for performance and user experience

**Dependencies**: Phase 6

**Requirements**:
- System testing (functional, integration, performance)
- Bug fixing and optimization
- User experience improvements
- Security testing
- Documentation

**Success Criteria**:
1. All system functionality is tested and working correctly
2. Performance issues are identified and resolved
3. User experience is optimized based on feedback
4. Security vulnerabilities are fixed
5. Comprehensive documentation is available

## Progress

| Phase | Status | Progress |
|-------|--------|----------|
| 1     | Complete | 100%     |
| 2     | Complete | 100%     |
| 3     | Complete | 100%     |
| 4     | Pending | 0%       |
| 5     | Pending | 0%       |
| 6     | Pending | 0%       |
| 7     | Pending | 0%       |

## Traceability

| Requirement | Phase   | Status  |
| ----------- | ------- | ------- |
| LOY-001     | Phase 2 | Complete |
| LOY-002     | Phase 2 | Complete |
| LOY-003     | Phase 2 | Complete |
| LOY-004     | Phase 2 | Complete |
| MSG-001     | Phase 3 | Complete |
| MSG-002     | Phase 3 | Complete |
| MSG-003     | Phase 3 | Complete |
| MSG-004     | Phase 3 | Complete |
| MSG-005     | Phase 3 | Complete |
| COMP-001    | Phase 4 | Pending |
| COMP-002    | Phase 4 | Pending |
| COMP-003    | Phase 4 | Pending |
| COMP-004    | Phase 4 | Pending |
| ERP-001     | Phase 5 | Pending |
| ERP-002     | Phase 5 | Pending |
| ERP-003     | Phase 5 | Pending |
| ADMIN-001   | Phase 6 | Pending |
| ADMIN-002   | Phase 6 | Pending |
| ADMIN-003   | Phase 6 | Pending |
| ADMIN-004   | Phase 6 | Pending |