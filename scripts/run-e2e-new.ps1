#!/usr/bin/env pwsh
param(
    [Parameter(HelpMessage="Запуск конкретного теста или папки")]
    [string]$TestCase = "test:e2e:smoke",
    [switch]$VerboseOutput,
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

# --- Конфигурация ---
$BackendPort = 8000
$FrontendPort = 5173
$ArtifactsDir = Join-Path $PSScriptRoot "..\tests\artifacts\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
if (!(Test-Path $ArtifactsDir)) { New-Item -ItemType Directory -Path $ArtifactsDir | Out-Null }

function Write-Step ([string]$msg) { Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] 🚀 $msg" -ForegroundColor Cyan }
function Write-Success ([string]$msg) { Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Error-Custom ([string]$msg) { Write-Host "❌ $msg" -ForegroundColor Red }

$TestExitCode = 0

try {
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "🧪 ERP GREENHOUSE: TOTAL REPRESSION" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta

    # --- 1. Очистка (Прогресс-бар для красоты и контроля) ---
    Write-Step "Очистка портов $BackendPort и $FrontendPort..."
    $ports = @($BackendPort, $FrontendPort)
    foreach ($port in $ports) {
        $procId = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
        if ($procId) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "  Убит процесс $procId на порту $port" -ForegroundColor Gray
        }
    }

    # --- 2. Запуск Backend (В ФОНЕ, чтобы AI видел логи здесь) ---
    Write-Step "Запуск Backend..."
    $env:E2E_TEST_MODE = "true"
    $env:E2E_ADMIN_SECRET = "test-secret-key"

    $BackendJob = Start-Job -ScriptBlock {
        param($path)
        cd $path
        # Адаптация под твой venv
        & ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --port 8000
    } -ArgumentList (Join-Path $PSScriptRoot "..\middleware")

    # Ожидание порта
    $waitCount = 0
    while (!(Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue) -and $waitCount -lt 20) {
        Write-Progress -Activity "Ожидание Backend" -Status "Загрузка..." -PercentComplete ($waitCount * 5)
        Start-Sleep -Seconds 1
        $waitCount++
    }

    # --- 3. Запуск Frontend ---
    Write-Step "Запуск Frontend (Vite)..."
    $FrontendJob = Start-Job -ScriptBlock {
        param($path)
        cd $path
        npm run dev -- --port 5173
    } -ArgumentList (Join-Path $PSScriptRoot "..\admin-ui")

    Start-Sleep -Seconds 10 # Даем Vite время на старт

    # --- 4. Запуск тестов (Главное изменение) ---
    Write-Step "Запуск тестов: $TestCase..."
    Set-Location (Join-Path $PSScriptRoot "..\admin-ui")

    # Запуск через npx для захвата вывода
    $testResult = Invoke-Expression "npm run $TestCase"
    $TestExitCode = $LASTEXITCODE

    # --- 5. Итоги ---
    $Duration = (Get-Date) - $StartTime
    Write-Host "`n========================================" -ForegroundColor Magenta
    if ($TestExitCode -eq 0) {
        Write-Success "ВСЕ ТЕСТЫ ПРОЙДЕНЫ"
    } else {
        Write-Error-Custom "ТЕСТЫ ПРОВАЛЕНЫ (Код: $TestExitCode)"
        # AI должен прочитать этот файл
        $testResult | Out-File (Join-Path $ArtifactsDir "test_output.log")
    }
    Write-Host "Время выполнения: $($Duration.ToString('mm\:ss'))" -ForegroundColor Gray
    Write-Host "Артефакты сохранены в: $ArtifactsDir" -ForegroundColor Gray

} catch {
    Write-Error-Custom "Критическая ошибка скрипта: $($_.Exception.Message)"
    $TestExitCode = 1
} finally {
    if (!$KeepRunning) {
        Write-Step "Завершение процессов..."
        Get-Job | Remove-Job -Force
        # Финальный taskkill на случай зависших node/python
        lsof -ti:8000,5173 | xargs kill -9 2>$null # Для Linux/macOS
        # Для Windows:
        Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
    }
}

exit $TestExitCode
