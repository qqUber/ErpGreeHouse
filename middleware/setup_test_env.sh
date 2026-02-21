#!/bin/bash
# setup_test_env.sh - Cross-platform test environment setup

echo "🚀 Setting up Telegram CRM MVP Test Environment"

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

echo "📋 Detected OS: $OS"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to find Python executable (excludes WindowsApps stub on Windows)
find_python() {
    if [[ "$OS" == "windows" ]]; then
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

# 1. Python Installation Check
echo "📦 Checking Python installation..."
PYTHON_CMD=$(find_python)

if [[ -z "$PYTHON_CMD" ]]; then
    echo "❌ Python 3.11+ not found. Please install from python.org"
    if [[ "$OS" == "windows" ]]; then
        echo "   Expected locations:"
        echo "   - %LOCALAPPDATA%\\Programs\\Python\\Python314\\python.exe"
        echo "   - %LOCALAPPDATA%\\Programs\\Python\\Python313\\python.exe"
        echo "   - %LOCALAPPDATA%\\Programs\\Python\\Python312\\python.exe"
        echo "   - %LOCALAPPDATA%\\Programs\\Python\\Python311\\python.exe"
    fi
    exit 1
fi

echo "✅ Using Python: $PYTHON_CMD"
"$PYTHON_CMD" --version

# 2. Redis Installation Check
echo "🔧 Checking Redis installation..."
if ! command_exists redis-server; then
    echo "⚠️ Redis not found. Installing..."
    if [[ "$OS" == "linux" ]]; then
        sudo apt update && sudo apt install -y redis-server
    else
        echo "❌ Please install Redis manually on Windows"
        echo "   Download from: https://github.com/microsoftarchive/redis/releases"
        exit 1
    fi
fi

# Start Redis if not running
if ! redis-cli ping >/dev/null 2>&1; then
    echo "🔄 Starting Redis..."
    if [[ "$OS" == "linux" ]]; then
        sudo systemctl start redis-server
    else
        echo "⚠️ Please start Redis service manually on Windows"
    fi
fi

# 3. Create Virtual Environment
echo "🐍 Creating virtual environment..."
VENV_DIR="venv"
if [[ ! -d "$VENV_DIR" ]]; then
    $PYTHON_CMD -m venv $VENV_DIR
fi

# Activate virtual environment
if [[ "$OS" == "linux" ]]; then
    source $VENV_DIR/bin/activate
else
    source $VENV_DIR/Scripts/activate
fi

# Upgrade pip
echo "📈 Upgrading pip..."
pip install --upgrade pip

# 4. Install Dependencies
echo "📚 Installing test dependencies..."
pip install pytest pytest-asyncio pytest-cov pytest-mock pytest-html
pip install playwright pytest-playwright
pip install locust
pip install safety bandit
pip install httpx aiohttp
pip install structlog

# 5. Install Playwright Browsers
echo "� Installing Playwright browsers..."
playwright install chromium

# 6. Create Test Environment File
echo "⚙️ Creating test environment configuration..."
cat > .env.test << EOF
TELEGRAM_BOT_TOKEN=test_token_12345
REDIS_URL=redis://localhost:6379/1
WEBHOOK_SECRET=test_secret_key
BASE_WEB_URL=http://localhost:8000
ERP_API_BASE_URL=http://localhost:8000
ERP_API_KEY=test_api_key
ERP_API_SECRET=test_api_secret
ERP_MOCK_MODE=true
EOF

# 7. Create Test Directory Structure
echo "📁 Creating test directory structure..."
mkdir -p tests/{unit,integration,e2e,load,security,fixtures}
mkdir -p reports/$(date +%Y%m%d)

# 8. Create Basic Test Files if they don't exist
if [[ ! -f "tests/unit/test_erp_client.py" ]]; then
    echo "📝 Creating basic unit tests..."
    cat > tests/unit/test_erp_client.py << 'EOF'
import pytest
from unittest.mock import Mock, patch

class TestERPClient:
    
    def test_basic_functionality(self):
        """Basic test to verify setup works"""
        assert True
    
    def test_redis_connection(self):
        """Test Redis connection"""
        import redis
        try:
            r = redis.from_url("redis://localhost:6379/0")
            r.ping()
            assert True
        except:
            pytest.skip("Redis not available")
EOF
fi

# 9. Make scripts executable
chmod +x *.sh 2>/dev/null || true

echo "✅ Test environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Activate virtual environment:"
if [[ "$OS" == "linux" ]]; then
    echo "   source $VENV_DIR/bin/activate"
else
    echo "   $VENV_DIR\\Scripts\\activate"
fi
echo "2. Run tests: ./run_tests.sh"
echo "3. Collect metrics: ./collect_metrics.sh"
echo ""
echo "📊 Environment info:"
echo "Python: $($PYTHON_CMD --version)"
echo "Pip: $(pip --version)"
echo "Virtual Environment: $VENV_DIR"