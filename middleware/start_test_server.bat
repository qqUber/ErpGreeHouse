@echo off
set E2E_TEST_MODE=true
set E2E_ADMIN_SECRET=test-secret-key
echo Starting server with E2E_TEST_MODE=%E2E_TEST_MODE%
python -m uvicorn app.main:app --port 8000
