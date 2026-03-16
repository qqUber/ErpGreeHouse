# Скрипт для полной пересборки и запуска MVP окружения
$FRONTEND_PORT = 5173
$BACKEND_PORT = 8000

Write-Host "--- 🏗️ Starting MVP Environment Build & Run ---" -ForegroundColor Cyan

# 1. Очистка портов (чтобы избежать конфликтов "зомби-процессов")
Write-Host "[1/4] Cleaning up ports $FRONTEND_PORT and $BACKEND_PORT..." -ForegroundColor Gray
Get-NetTCPConnection -LocalPort $FRONTEND_PORT, $BACKEND_PORT -ErrorAction SilentlyContinue | ForEach-Object {
    $procId = $_.OwningProcess
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopping process $procId on port $($_.LocalPort)" -ForegroundColor Yellow
}

# 2. Подготовка Бэкенда
Write-Host "[2/4] Starting Backend (FastAPI)..." -ForegroundColor Gray
Start-Job -Name "Backend-Service" -ScriptBlock {
    cd "$using:PSScriptRoot\..\middleware"
    # Активация venv если есть, иначе прямой запуск
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
}

# 3. Сборка и запуск Фронтенда (с учетом Biome)
Write-Host "[3/4] Building and starting Frontend (Vue 3 + Biome)..." -ForegroundColor Gray
Start-Job -Name "Frontend-Service" -ScriptBlock {
    cd "$using:PSScriptRoot\..\admin-ui"
    # Проверка типов и линтинг перед запуском (Enterprise standard)
    npm run lint
    npm run dev -- --port 5173
}

# 4. Мониторинг запуска
Write-Host "[4/4] Waiting for services to stabilize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

$backendStatus = Get-NetTCPConnection -LocalPort $BACKEND_PORT -ErrorAction SilentlyContinue
$frontendStatus = Get-NetTCPConnection -LocalPort $FRONTEND_PORT -ErrorAction SilentlyContinue

if ($backendStatus -and $frontendStatus) {
    Write-Host "✅ MVP Environment is READY!" -ForegroundColor Green
    Write-Host "🔗 Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor White
    Write-Host "🔗 Backend API: http://localhost:$BACKEND_PORT/docs" -ForegroundColor White
} else {
    Write-Host "❌ Failed to start services. Check jobs: Get-Job" -ForegroundColor Red
}

Write-Host "--- Use 'Stop-Job *' to kill background processes ---" -ForegroundColor Cyan
