#!/usr/bin/env pwsh
# run-e2e-tests.ps1 - Run E2E tests with explicit environment variables
# 
# Usage: .\scripts\run-e2e-tests.ps1
# 
# This script:
# 1. Kills existing processes on ports 8000 and 5173
# 2. Sets E2E environment variables EXPLICITLY
# 3. Starts backend and frontend
# 4. Runs Playwright E2E tests
# 5. Cleans up processes

param(
    [switch]$SkipCleanup,
    [switch]$KeepRunning
)

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
$BackendWaitSeconds = 20
$FrontendWaitSeconds = 15

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$MiddlewareDir = Join-Path $ProjectRoot "middleware"
$AdminUiDir = Join-Path $ProjectRoot "admin-ui"

# =============================================================================
# Step 1: Cleanup existing processes
# =============================================================================
Write-Host "[Step 1/6] Cleaning up existing processes..." -ForegroundColor Yellow

if (-not $SkipCleanup) {
    # Kill processes on backend port
    $backendProc = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($backendProc) {
        Write-Host "  Killing backend process PID $backendProc on port $BackendPort..." -ForegroundColor Cyan
        Stop-Process -Id $backendProc -Force -ErrorAction SilentlyContinue
    }

    # Kill processes on frontend port
    $frontendProc = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($frontendProc) {
        Write-Host "  Killing frontend process PID $frontendProc on port $FrontendPort..." -ForegroundColor Cyan
        Stop-Process -Id $frontendProc -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds 3
}

Write-Host "  ✅ Cleanup complete" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 2: Set environment variables
# =============================================================================
Write-Host "[Step 2/6] Setting E2E environment variables..." -ForegroundColor Yellow
$env:E2E_TEST_MODE = $E2ETestMode
$env:E2E_ADMIN_SECRET = $E2EAdminSecret
Write-Host "  E2E_TEST_MODE=$env:E2E_TEST_MODE" -ForegroundColor Cyan
Write-Host "  E2E_ADMIN_SECRET=$env:E2E_ADMIN_SECRET" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# Step 3: Start backend
# =============================================================================
Write-Host "[Step 3/6] Starting backend..." -ForegroundColor Yellow

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
    if (-not $KeepRunning) {
        pause
        exit 1
    }
}
Write-Host ""

# =============================================================================
# Step 4: Start frontend
# =============================================================================
Write-Host "[Step 4/6] Starting frontend..." -ForegroundColor Yellow

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
# Step 5: Run tests
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
Write-Host "🏁 Tests completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 6: Cleanup
# =============================================================================
if (-not $KeepRunning) {
    Write-Host "Press any key to stop services..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    Write-Host "[Step 6/6] Stopping services..." -ForegroundColor Yellow
    Get-Process | Where-Object { $_.MainWindowTitle -like "*Backend*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process | Where-Object { $_.MainWindowTitle -like "*Frontend*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ Services stopped" -ForegroundColor Green
} else {
    Write-Host "Keeping services running. Close the windows manually." -ForegroundColor Yellow
}

# Exit with test exit code
exit $TestExitCode
