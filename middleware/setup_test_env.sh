#!/bin/bash

# Скрипт для полной пересборки и запуска MVP окружения (Linux/macOS/WSL)
FRONTEND_PORT=5173
BACKEND_PORT=8000

# Цвета для вывода
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}--- 🏗️ Starting MVP Environment Build & Run ---${NC}"

# 1. Очистка портов
echo -e "[1/4] Cleaning up ports $FRONTEND_PORT and $BACKEND_PORT..."
for PORT in $FRONTEND_PORT $BACKEND_PORT; do
    PID=$(lsof -t -i:$PORT)
    if [ ! -z "$PID" ]; then
        echo -e "${YELLOW}Stopping process $PID on port $PORT${NC}"
        kill -9 $PID
    fi
done

# 2. Подготовка Бэкенда
echo -e "[2/4] Starting Backend (FastAPI)..."
(
    cd middleware || exit
    # Запуск uvicorn (предполагается, что зависимости установлены)
    python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
) &
BACKEND_PID=$!

# 3. Сборка и запуск Фронтенда
echo -e "[3/4] Building and starting Frontend (Vue 3 + Biome)..."
(
    cd admin-ui || exit
    # Enterprise check: линтинг перед запуском
    npm run lint && npm run dev -- --port 5173
) &
FRONTEND_PID=$!

# 4. Мониторинг запуска
echo -e "[4/4] Waiting for services to stabilize..."
sleep 5

# Простая проверка доступности
if curl -s --head  --request GET http://localhost:$FRONTEND_PORT | grep "200 OK" > /dev/null; then
    echo -e "${GREEN}✅ MVP Environment is READY!${NC}"
    echo -e "🔗 Frontend: http://localhost:$FRONTEND_PORT"
    echo -e "🔗 Backend API: http://localhost:$BACKEND_PORT/docs"
else
    echo -e "${RED}❌ Failed to start services. Check terminal logs above.${NC}"
fi

echo -e "${CYAN}--- Press Ctrl+C to stop all services ---${NC}"

# Ожидание прерывания пользователем, чтобы убить дочерние процессы
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM EXIT
wait
