# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-18

### Added
- **Dynamic Currency Formatting System**
  - Environment-driven currency configuration (CURRENCY_CODE, CURRENCY_SYMBOL, etc.)
  - Babel.numbers backend formatting with locale support
  - Intl.NumberFormat frontend formatting with proper fallbacks
  - Support for RU (1 000 ₽), EN ($1,000.00), SR (1.235 RSD) formatting
  - Replaced all hardcoded currency symbols with dynamic formatCurrency()

- **Gender Correction System**
  - Embedded JSON dictionaries for RU/SR/EN names and surnames
  - GenderDetector class with LRU caching and smart detection
  - Localized gender warnings (RU/SR/EN) without auto-correction
  - Integration into normalize_name pipeline
  - Support for neutral names priority and multi-part name handling

- **Comprehensive Testing**
  - 16 unit tests for currency formatter with 100% coverage
  - 25 unit tests for gender correction covering edge cases
  - 11 integration tests for end-to-end workflows
  - Performance and concurrency testing
  - Multi-locale customer creation scenarios

- **Frontend Migration**
  - Updated App.tsx, ProductsTable.tsx, CustomersTable.tsx components
  - Migrated MarketingView.tsx and LoyaltyTmaView.tsx to dynamic formatting
  - Added formatCurrency() and AnalyticsView imports
  - Maintained backward compatibility with existing money() function

### Changed
- **Configuration**
  - Added comprehensive .env.example with currency settings
  - Support for flexible symbol positioning and decimal places
  - Locale-aware currency code selection

- **API Responses**
  - normalize_name() now returns dict with normalized, detected_gender, gender_warning, suggestions
  - Updated customer_identity.py to handle new return format
  - Maintained backward compatibility for existing integrations

### Fixed
- Applied Black formatting to all modified files for CI/CD compliance
- Updated test_identify.py to handle new normalize_name return structure
- Fixed TypeScript imports in App.tsx (formatCurrency, AnalyticsView)

## [1.0.0] - 2026-02-17

### Added
- Initial release of Telegram CRM MVP with ERPNext integration
- Async Python middleware with FastAPI and aiogram
- Telegram bot with command handlers for customer registration
- ERPNext integration client with mock mode for development
- Cross-platform testing scripts for Linux and Windows
- Comprehensive testing framework (unit, integration, E2E, load, security)
- 152-FZ compliance for Russian data protection
- Rate limiting and security measures
- Docker containerization support
- Redis-based session management and caching
- Celery workers for background task processing
- Structured logging and error handling
- Pre-commit hooks for code quality
- Documentation structure in `/docs` directory

### Security
- JWT authentication for API access
- Webhook validation for Telegram
- Input validation and sanitization
- Rate limiting protection
- Secure environment variable handling

### Technical
- Python 3.11+ requirement
- FastAPI 0.115+ for async web framework
- aiogram 3.13+ for Telegram bot API
- Redis 6.0+ for caching and sessions
- PostgreSQL 12+ for data storage
- pytest for testing framework
- Black, isort, flake8 for code formatting
- Bandit for security scanning

### Documentation
- Comprehensive README with installation guides
- Architecture documentation
- Development plans and MVP scope
- Testing strategy and reports
- Pre-commit code review checklist
- Project structure validation

## [Unreleased]

### Planned
- Production deployment guides
- Advanced analytics and reporting
- Multi-language support
- Advanced loyalty program features
- Mobile application integration
- Advanced security features
- Performance optimization
- Monitoring and alerting system