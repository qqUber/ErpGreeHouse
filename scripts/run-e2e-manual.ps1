#!/usr/bin/env pwsh
# Run E2E tests manually - bypassing .ps1 association issue
# Usage: powershell -ExecutionPolicy Bypass -File scripts\run-e2e-manual.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "🧪 ERP GreenHouse E2E Test Runner" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Configuration
$BackendPort = 8000
$FrontendPort = 5173
$E2ETestMode = "true"
$E2EAdminSecret = "test-secret-key"
$BackendWaitSeconds = 15
$FrontendWaitSeconds = 10

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$MiddlewareDir = Join-Path $ProjectRoot "middleware"
$AdminUiDir = Join-Path $ProjectRoot "admin-ui"

# =============================================================================
# Step 1: Cleanup existing processes
# =============================================================================
Write-Host "[Step 1/6] Cleaning up existing processes..." -ForegroundColor Yellow

# Kill processes on backend port
$backendProc = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($backendProc) {
    Write-Host "  Killing backend process PID $backendProc..." -ForegroundColor Cyan
    Stop-Process -Id $backendProc -Force -ErrorAction SilentlyContinue
}

# Kill processes on frontend port
$frontendProc = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($frontendProc) {
    Write-Host "  Killing frontend process PID $frontendProc..." -ForegroundColor Cyan
    Stop-Process -Id $frontendProc -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2
Write-Host "  ✅ Cleanup complete" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 2: Start backend
# =============================================================================
Write-Host "[Step 2/6] Starting backend..." -ForegroundColor Yellow

$BackendScript = @"
`$env:E2E_TEST_MODE = '$E2ETestMode'
`$env:E2E_ADMIN_SECRET = '$E2EAdminSecret'
Write-Host 'Starting backend with E2E configuration...' -ForegroundColor Green
Set-Location '$MiddlewareDir'
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 0.0.0.0 --port $BackendPort
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendScript -WindowStyle Normal

Write-Host "  Waiting ${BackendWaitSeconds}s for backend to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds $BackendWaitSeconds

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Backend is running" -ForegroundColor Green
    } else {
        throw "Backend returned status $($response.StatusCode)"
    }
} catch {
    Write-Host "  ❌ Backend failed to start!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Check the Backend window for errors." -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host ""

# =============================================================================
# Step 3: Start frontend
# =============================================================================
Write-Host "[Step 3/6] Starting frontend..." -ForegroundColor Yellow

$FrontendScript = @"
Write-Host 'Starting frontend...' -ForegroundColor Green
Set-Location '$AdminUiDir'
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendScript -WindowStyle Normal

Write-Host "  Waiting ${FrontendWaitSeconds}s for frontend to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds $FrontendWaitSeconds
Write-Host "  ✅ Frontend should be running" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 4: Run tests
# =============================================================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Services started, running tests..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Set-Location $AdminUiDir
npm run test:e2e:smoke
$TestExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "🏁 Tests completed with exit code: $TestExitCode" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 5: Cleanup
# =============================================================================
Write-Host "Press any key to stop services..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "[Step 5/6] Stopping services..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.MainWindowTitle -like "*Backend*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.MainWindowTitle -like "*Frontend*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  ✅ Services stopped" -ForegroundColor Green

# Exit with test exit code
exit $TestExitCode
