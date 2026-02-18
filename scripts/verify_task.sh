#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "BUILD: admin-ui"
cd "$ROOT_DIR/admin-ui"
npm ci
npm run build

echo "TESTS: middleware"
cd "$ROOT_DIR/middleware"
./setup_test_env.sh
./run_tests.sh

echo "COVERAGE: security/auth"
pytest -q \
  --cov=app.admin_auth_api \
  --cov=app.security \
  --cov=app.rate_limit \
  --cov=app.request_context \
  --cov=app.runtime \
  --cov-report=term \
  --cov-fail-under=80

echo "DOCKER: middleware"
cd "$ROOT_DIR"
docker build -f middleware/Dockerfile -t erpgreehouse-middleware:verify ./middleware

echo "COMPOSE: validate"
docker compose -f docker-compose.yml config >/dev/null

echo "OK"
