@echo off
REM run-e2e-tests.bat - Run E2E tests with explicit environment variables
REM 
REM Usage: .\run-e2e-tests.bat
REM 
REM This script:
REM 1. Kills existing processes on ports 8000 and 5173
REM 2. Sets E2E environment variables EXPLICITLY
REM 3. Starts backend and frontend
REM 4. Runs Playwright E2E tests
REM 5. Cleans up processes

echo ========================================
echo 🧪 ERP GreenHouse E2E Test Runner
echo ========================================
echo.

echo [Step 1/5] Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)
timeout /t 3 /nobreak >nul
echo ✅ Cleanup complete
echo.

echo [Step 2/5] Starting backend with E2E configuration...
cd /d "%~dp0..\middleware"
start "Backend" cmd /k "title E2E Backend && echo Starting backend with E2E_TEST_MODE=true... && .venv\Scripts\activate && set E2E_TEST_MODE=true && set E2E_ADMIN_SECRET=test-secret-key && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [Step 3/5] Waiting 20 seconds for backend to initialize...
timeout /t 20 /nobreak >nul
echo ✅ Backend should be running

echo.
echo [Step 4/5] Starting frontend...
cd /d "%~dp0..\admin-ui"
start "Frontend" cmd /k "title E2E Frontend && echo Starting frontend... && npm run dev"

echo [Step 5/5] Waiting 15 seconds for frontend to initialize...
timeout /t 15 /nobreak >nul
echo ✅ Frontend should be running

echo.
echo ========================================
echo ✅ Services started! Running tests...
echo ========================================
echo.

npm run test:e2e:smoke

echo.
echo ========================================
echo 🏁 Tests completed!
echo ========================================
echo.
echo Press any key to stop services...
pause >nul

taskkill /F /FI "WINDOWTITLE eq *Backend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq *Frontend*" 2>nul
echo ✅ Services stopped
