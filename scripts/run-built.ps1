# --- 🏗️ MVP Greenhouse Controller (Reliable Build) ---
$FRONTEND_PORT = 5173
$BACKEND_PORT = 8000
$REDIS_PORT = 6379
$BASE_DIR = Resolve-Path "$PSScriptRoot\.."
$LOG_DIR = "$PSScriptRoot\logs"

# Создаем папку для логов, если её нет
if (!(Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR | Out-Null }

function Stop-PortProcesses {
    param([int[]]$Ports)
    foreach ($port in $Ports) {
        Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

try {
    Write-Host "`n[0/4] Pre-flight Check..." -ForegroundColor Cyan
    Stop-PortProcesses -Ports $FRONTEND_PORT, $BACKEND_PORT

    if (-not (Test-NetConnection -ComputerName localhost -Port $REDIS_PORT -InformationLevel Quiet)) {
        throw "Redis не запущен на порту $REDIS_PORT! Запусти Memurai."
    }
    Write-Host "✅ Redis is online." -ForegroundColor Green

    # 1. Проверка пути к бэкенду
    $backendPath = Join-Path $BASE_DIR "middleware\app"
    if (-not (Test-Path (Join-Path $backendPath "main.py"))) {
        throw "Файл main.py не найден в $backendPath. Проверь структуру папок!"
    }

    # 2. Запуск Бэкенда
    Write-Host "[2/4] Starting Backend (FastAPI)..." -ForegroundColor Gray
    $backendLog = "$LOG_DIR\backend.log"
    Start-Job -Name "Backend-Service" -ScriptBlock {
        param($path, $log)
        cd $path
        # Ищем venv или системный python
        $py = if (Test-Path ".\venv\Scripts\python.exe") { ".\venv\Scripts\python.exe" } else { "python" }
        # Запускаем и принудительно пишем ВСЕ ошибки (2>&1) в файл
        & $py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 2>&1 | Out-File $log -Encoding utf8
    } -ArgumentList $backendPath, $backendLog

    # 3. Запуск Фронтенда
    Write-Host "[3/4] Starting Frontend (Vite)..." -ForegroundColor Gray
    $frontendLog = "$LOG_DIR\frontend.log"
    Start-Job -Name "Frontend-Service" -ScriptBlock {
        param($path, $log)
        cd $path
        npx @biomejs/biome check . --write # Пытаемся сразу починить мелкие ошибки
        npm run dev -- --port 5173 2>&1 | Out-File $log -Encoding utf8
    } -ArgumentList (Join-Path $BASE_DIR "admin-ui"), $frontendLog

    Write-Host "[4/4] Waiting for services to stabilize (10s)..." -ForegroundColor Gray
    Start-Sleep -Seconds 10

    # Финальная проверка портов
    $be = Test-NetConnection -ComputerName localhost -Port $BACKEND_PORT -InformationLevel Quiet
    $fe = Test-NetConnection -ComputerName localhost -Port $FRONTEND_PORT -InformationLevel Quiet

    if ($be -and $fe) {
        Write-Host "`n✅ MVP Environment is READY!" -ForegroundColor Green
    } else {
        throw "Сервисы не поднялись. Читай логи в папке scripts/logs/"
    }
}
catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Stop-PortProcesses -Ports $FRONTEND_PORT, $BACKEND_PORT
    Stop-Job * -ErrorAction SilentlyContinue
}