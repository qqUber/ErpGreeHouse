# GitHub Repository Configuration Guide

This document lists all required GitHub Secrets and Environments for CI/CD pipelines.

## Required GitHub Secrets

### Telegram Integration
| Secret Name | Purpose | Used In |
|-------------|---------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot authentication for Telegram API | cd-dev.yml, cd-staging.yml, cd-prod.yml, telegram-integration.yml |
| `TELEGRAM_CHANNEL_ID` | Target channel for notifications | telegram-integration.yml |

### VK (VKontakte) Integration
| Secret Name | Purpose | Used In |
|-------------|---------|---------|
| `VK_ACCESS_TOKEN` | VK API access token | cd-dev.yml, cd-staging.yml, cd-prod.yml, telegram-integration.yml |
| `VK_GROUP_ID` | Target VK group ID | cd-dev.yml, cd-staging.yml, cd-prod.yml, telegram-integration.yml |

### ERPNext Integration
| Secret Name | Purpose | Used In |
|-------------|---------|---------|
| `ERP_API_KEY` | ERPNext API key | cd-dev.yml, cd-staging.yml, cd-prod.yml, telegram-integration.yml |
| `ERP_API_SECRET` | ERPNext API secret | cd-dev.yml, cd-staging.yml, cd-prod.yml, telegram-integration.yml |

### Security
| Secret Name | Purpose | Used In |
|-------------|---------|---------|
| `JWT_SECRET_KEY` | JWT token signing | cd-dev.yml, cd-staging.yml, cd-prod.yml, telegram-integration.yml |
| `WEBHOOK_SECRET` | Webhook verification | cd-dev.yml, cd-staging.yml, cd-prod.yml, telegram-integration.yml |

### Notifications (Optional)
| Secret Name | Purpose | Used In |
|-------------|---------|---------|
| `SLACK_WEBHOOK_URL` | Slack notifications | e2e-dev.yml |
| `TEAMS_WEBHOOK_URL` | Microsoft Teams notifications | e2e-dev.yml |

### Code Coverage (Optional)
| Secret Name | Purpose | Used In |
|-------------|---------|---------|
| `CODECOV_TOKEN` | Codecov.io upload | tests.yml |

## Required GitHub Environments

Configure these in: Settings → Environments

### `development`
- Required for: `cd-dev.yml`, `telegram-integration.yml`
- Deployment branches: `dev`, `dev-clean`

### `staging`
- Required for: `cd-staging.yml`
- Deployment branches: `staging`

### `production`
- Required for: `cd-prod.yml`
- Deployment branches: `main`
- **Recommended**: Add required reviewers (minimum 1)

## Setup Instructions

### 1. Create Environments
1. Go to Settings → Environments
2. Click "New environment"
3. Name: `development`, `staging`, `production`
4. Configure protection rules as needed

### 2. Add Secrets
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add all secrets listed above

### 3. Verify Configuration
Run the following workflow to verify:
```bash
gh workflow run ci.yml
```

## CI/CD Improvements Applied

Recent DevOps fixes:
- ✅ Removed all `|| true` error masking from critical steps
- ✅ Standardized Python 3.14 and Node 24 across all workflows
- ✅ Fixed PostgreSQL version (16-alpine)
- ✅ Replaced deprecated `safety` with `pip-audit`
- ✅ Synced pre-commit versions with requirements.txt
- ✅ Removed `|| true` from linting commands (flake8, mypy, isort, bandit)
- ✅ Fixed git fetch error masking in CD workflows
