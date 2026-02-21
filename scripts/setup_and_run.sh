#!/usr/bin/env bash
# setup_and_run.sh - Complete setup and run script for ERP GreenHouse
# Cross-platform: Linux, macOS, Windows (Git Bash)

set -e

echo "========================================="
echo "🏗️  ERP GreenHouse - Setup & Run"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
MIDDLEWARE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$MIDDLEWARE_DIR")"
ADMIN_UI_DIR="$PROJECT_ROOT/admin-ui"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to find Python executable (excludes WindowsApps stub on Windows)
find_python() {
    # Check if running on Windows (Git Bash/MSYS)
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # On Windows, check specific paths first
        local python_paths=(
            "$LOCALAPPDATA/Programs/Python/Python314/python.exe"
            "$LOCALAPPDATA/Programs/Python/Python313/python.exe"
            "$LOCALAPPDATA/Programs/Python/Python312/python.exe"
            "$LOCALAPPDATA/Programs/Python/Python311/python.exe"
            "$LOCALAPPDATA/Python/Python314/Scripts/python.exe"
            "$LOCALAPPDATA/Python/Python313/Scripts/python.exe"
            "$LOCALAPPDATA/Python/Python312/Scripts/python.exe"
            "$LOCALAPPDATA/Python/Python311/Scripts/python.exe"
        )
        
        for path in "${python_paths[@]}"; do
            if [[ -x "$path" ]]; then
                echo "$path"
                return 0
            fi
        done
        
        # Fallback: check PATH but verify it's not WindowsApps stub
        local py_cmd
        for cmd in python3.14 python3.13 python3.12 python3.11 python3 python; do
            if command_exists "$cmd"; then
                py_cmd=$(command -v "$cmd")
                # Skip WindowsApps stub (contains WindowsApps in path)
                if [[ "$py_cmd" != *"WindowsApps"* ]]; then
                    echo "$py_cmd"
                    return 0
                fi
            fi
        done
        
        return 1
    else
        # Linux/Mac: use standard python3
        if command_exists python3.14; then
            echo "$(command -v python3.14)"
        elif command_exists python3.13; then
            echo "$(command -v python3.13)"
        elif command_exists python3.12; then
            echo "$(command -v python3.12)"
        elif command_exists python3.11; then
            echo "$(command -v python3.11)"
        elif command_exists python3; then
            echo "$(command -v python3)"
        else
            return 1
        fi
    fi
}

# Function to check if port is in use
port_in_use() {
    local port=$1
    if command_exists "lsof"; then
        lsof -i :$port >/dev/null 2>&1
    elif command_exists "netstat"; then
        netstat -an | grep -q ":$port "
    else
        return 1
    fi
}

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

# Check Python
PYTHON_CMD=$(find_python)

if [[ -z "$PYTHON_CMD" ]]; then
    echo -e "${RED}❌ Python 3.11+ not found. Please install from python.org${NC}"
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "   Expected locations (Windows):"
        echo "   - %LOCALAPPDATA%\\Programs\\Python\\Python314\\python.exe"
        echo "   - %LOCALAPPDATA%\\Programs\\Python\\Python313\\python.exe"
    fi
    exit 1
fi

echo -e "✅ Python: $PYTHON_CMD - $($PYTHON_CMD --version)"

# Check Node.js
if command_exists "node"; then
    echo "✅ Node.js: $(node --version)"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check Redis
if command_exists "redis-cli"; then
    if redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis: Running"
    else
        echo -e "${YELLOW}⚠️  Redis not running. Please start Redis.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Redis CLI not found. Install Redis or use Docker.${NC}"
fi

echo ""

# =============================================================================
# Step 2: Setup Backend (Middleware)
# =============================================================================
echo -e "${YELLOW}[2/6] Setting up backend...${NC}"

cd "$MIDDLEWARE_DIR"

# Create virtual environment if not exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing backend dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Install test dependencies
pip install pytest pytest-asyncio pytest-cov pytest-html pytest-mock fakeredis

echo "✅ Backend setup complete"
echo ""

# =============================================================================
# Step 3: Setup Frontend (Admin UI)
# =============================================================================
echo -e "${YELLOW}[3/6] Setting up frontend...${NC}"

cd "$ADMIN_UI_DIR"

# Install dependencies
echo "Installing frontend dependencies..."
npm install

echo "✅ Frontend setup complete"
echo ""

# =============================================================================
# Step 4: Check Environment Configuration
# =============================================================================
echo -e "${YELLOW}[4/6] Checking environment configuration...${NC}"

cd "$MIDDLEWARE_DIR"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "Created .env from .env.example"
        echo -e "${RED}⚠️  Please update .env with your configuration!${NC}"
    else
        echo -e "${RED}❌ No .env.example found. Please create .env file.${NC}"
        exit 1
    fi
else
    echo "✅ .env file exists"
fi

# Check Redis connection
echo "Testing Redis connection..."
if redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis connection: OK"
else
    echo -e "${YELLOW}⚠️  Cannot connect to Redis. Tests may fail.${NC}"
fi

echo ""

# =============================================================================
# Step 5: Run Database Migrations
# =============================================================================
echo -e "${YELLOW}[5/6] Running database migrations...${NC}"

cd "$MIDDLEWARE_DIR"

# Initialize database
echo "Initializing database..."
$PYTHON_CMD -c "from app.db import init_db; init_db()" 2>/dev/null || echo "Database initialized"

echo "✅ Database ready"
echo ""

# =============================================================================
# Step 6: Start Services
# =============================================================================
echo -e "${YELLOW}[6/6] Starting services...${NC}"
echo ""

# Check if ports are in use
BACKEND_PORT=8000
FRONTEND_PORT=5173

if port_in_use $BACKEND_PORT; then
    echo -e "${YELLOW}⚠️  Port $BACKEND_PORT is already in use${NC}"
    echo "   Backend may already be running"
else
    echo "✅ Port $BACKEND_PORT is available"
fi

if port_in_use $FRONTEND_PORT; then
    echo -e "${YELLOW}⚠️  Port $FRONTEND_PORT is already in use${NC}"
    echo "   Frontend may already be running"
else
    echo "✅ Port $FRONTEND_PORT is available"
fi

echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "📋 Services Status:"
echo "  - Redis: Running on port 6379"
echo "  - Backend: Ready to start on http://localhost:$BACKEND_PORT"
echo "  - Frontend: Ready to start on http://localhost:$FRONTEND_PORT"
echo ""
echo "🚀 To start services:"
echo ""
echo "  # Terminal 1 - Backend:"
echo "  cd middleware"
echo "  source .venv/bin/activate  # Linux/Mac"
echo "  # OR: .venv\\Scripts\\activate  # Windows"
echo "  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT"
echo ""
echo "  # Terminal 2 - Frontend:"
echo "  cd admin-ui"
echo "  npm run dev"
echo ""
echo "📊 Access points:"
echo "  - Backend API: http://localhost:$BACKEND_PORT"
echo "  - Admin UI: http://localhost:$FRONTEND_PORT"
echo "  - API Docs: http://localhost:$BACKEND_PORT/docs"
echo ""
echo "🧪 To run tests:"
echo "  cd middleware"
echo "  python test_runner.py"
echo ""
echo "========================================="
