# CI/CD (GitHub Actions)

Цель: автоматическое тестирование, сборка и «деплой в артефакты» (без хостинга) для окружений development/staging/production, включая quality/security gates и rollback.

## Ветвление и окружения

- `dev` → environment `development`
- `staging` → environment `staging`
- `main` → environment `production`

Окружения настраиваются в GitHub: Settings → Environments.
Рекомендуется включить approvals для `staging` и `production`.

## Workflows

### PR checks

Файл: `.github/workflows/pr.yml`

Запускается на PR в `dev`, `staging`, `main`.
Обязательные проверки:

- Dependency Review (изменения зависимостей)
- Secret scanning (diff по PR)
- CodeQL (python + javascript/typescript)
- pre-commit (format/lint/security hooks)
- Admin UI build + npm audit
- Middleware tests + pip-audit + bandit + coverage gate для security/auth модулей

Артефакты:

- `admin-ui-dist` (сборка UI)
- `middleware-reports` (pytest html отчёты)

### CD: development

Файл: `.github/workflows/cd-dev.yml`

Запускается на push в `dev`.

Пайплайн:

- build admin-ui
- тесты middleware
- docker build middleware
- upload артефактов в GitHub Actions
- обновление указателя версии окружения (deploy-manifests)

Артефакт:

- `dev-<sha>`

### CD: staging

Файл: `.github/workflows/cd-staging.yml`

Запускается на push в `staging`.
Артефакт:

- `staging-<sha>`

### CD: production

Файл: `.github/workflows/cd-prod.yml`

Запускается на push в `main`.
Артефакт:

- `prod-<sha>`

### Nightly security

Файл: `.github/workflows/security-nightly.yml`

Запускается по расписанию и вручную.

- Trivy fs scan (repo)
- Trivy image scan (middleware image)

Отчёты публикуются в GitHub Code Scanning (SARIF) и как Actions artifacts.

### Rollback

Файл: `.github/workflows/rollback.yml`

Запускается вручную.

Механика: обновляет «указатель текущей версии окружения» в ветке `deploy-manifests`.

- input: `environment` + `sha`
- output: файл `current/<environment>.json`

## Rollback pointer (deploy-manifests)

Ветка `deploy-manifests` используется как технический storage.

Файлы:

- `current/development.json`
- `current/staging.json`
- `current/production.json`

Содержат:

- `sha` текущей версии
- `run_id` и `run_url` для трассировки сборки
- имя артефакта (для CD workflows)

## Quality gates

- На PR: CodeQL, dependency review, secret scan, pre-commit, тесты, coverage gate (security/auth).
- Nightly: Trivy.

## Dependency updates

Dependabot: `.github/dependabot.yml`

- npm: `/admin-ui`
- pip: `/middleware`

## Где смотреть результаты

- PR: вкладка Checks + комментарий от workflow.
- Artifacts: Actions → конкретный run → секция Artifacts.
- Code Scanning: вкладка Security → Code scanning alerts.

## Definition of Done

Перед закрытием задачи использовать: `docs/definition-of-done.md`.
