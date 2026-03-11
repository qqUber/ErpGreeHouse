$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Write-Host 'BUILD: admin-ui'
Set-Location (Join-Path $Root 'admin-ui')
npm ci
npm run build

Write-Host 'TESTS: middleware'
Set-Location (Join-Path $Root 'middleware')
./setup_test_env.ps1
./run_tests.ps1 -TestType all

Write-Host 'COVERAGE: security/auth'
py -m pip install -q pytest-cov
py -m pytest -q `
  --cov=app.admin_auth_api `
  --cov=app.security `
  --cov=app.rate_limit `
  --cov=app.request_context `
  --cov=app.runtime `
  --cov-report=term `
  --cov-fail-under=80

Write-Host 'DOCKER: middleware'
Set-Location $Root
docker build -f middleware/Dockerfile -t erpgreehouse-middleware:verify ./middleware

Write-Host 'COMPOSE: validate'
docker compose -f docker-compose.yml config | Out-Null

Write-Host 'OK'
