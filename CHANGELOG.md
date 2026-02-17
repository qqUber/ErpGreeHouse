# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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