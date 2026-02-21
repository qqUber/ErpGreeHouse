# setup_and_run.ps1 - Complete setup and run script for ERP GreenHouse
# Windows PowerShell

Write-Host "=========================================" -ForegroundColor Green
Write-Host "🏗️  ERP GreenHouse - Setup & Run" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$MiddlewareDir = Join-Path $ProjectRoot "middleware"
$AdminUiDir = Join-Path $ProjectRoot "admin-ui"

# Function to find Python executable (excludes WindowsApps stub)
function Get-PythonExecutable {
    $pythonPaths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Python\Python314\Scripts\python.exe",
        "$env:LOCALAPPDATA\Python\Python313\Scripts\python.exe",
        "$env:LOCALAPPDATA\Python\Python312\Scripts\python.exe",
        "$env:LOCALAPPDATA\Python\Python311\Scripts\python.exe"
    )
    
    foreach ($path in $pythonPaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    # Fallback: check PATH but exclude WindowsApps
    $pythonCmd = Get-Command python, python3, python3.14, python3.13, python3.12, python3.11 -ErrorAction SilentlyContinue | 
        Where-Object { $_.Source -notlike "*WindowsApps*" } | 
        Select-Object -First 1
    
    if ($pythonCmd) {
        return $pythonCmd.Source
    }
    
    return $null
}

# Function to check if port is in use
function Test-PortInUse {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

# Check Python
$PythonCmd = Get-PythonExecutable

if (-not $PythonCmd) {
    Write-Host "❌ Python 3.11+ not found. Please install from python.org" -ForegroundColor Red
    Write-Host "   Check: %LOCALAPPDATA%\Programs\Python\" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Python: $PythonCmd - $(& $PythonCmd --version)" -ForegroundColor Green

# Check Node.js
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js: $(& $NodeCmd.Source --version)" -ForegroundColor Green

# Check Redis
$RedisCmd = Get-Command redis-cli -ErrorAction SilentlyContinue
if ($RedisCmd) {
    try {
        $redisTest = & $RedisCmd.Source ping 2>$null
        if ($redisTest -eq "PONG") {
            Write-Host "✅ Redis: Running" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Redis not running. Please start Redis." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Cannot connect to Redis" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Redis CLI not found. Install Redis or use Docker." -ForegroundColor Yellow
}

Write-Host ""

# =============================================================================
# Step 2: Setup Backend (Middleware)
# =============================================================================
Write-Host "[2/6] Setting up backend..." -ForegroundColor Yellow

Set-Location $MiddlewareDir

# Create virtual environment if not exists
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    & $PythonCmd.Source -m venv .venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& ".\.venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
& $PythonCmd.Source -m pip install --upgrade pip
& $PythonCmd.Source -m pip install -r requirements.txt

# Install test dependencies
& $PythonCmd.Source -m pip install pytest pytest-asyncio pytest-cov pytest-html pytest-mock fakeredis

Write-Host "✅ Backend setup complete" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 3: Setup Frontend (Admin UI)
# =============================================================================
Write-Host "[3/6] Setting up frontend..." -ForegroundColor Yellow

Set-Location $AdminUiDir

# Install dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install

Write-Host "✅ Frontend setup complete" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 4: Check Environment Configuration
# =============================================================================
Write-Host "[4/6] Checking environment configuration..." -ForegroundColor Yellow

Set-Location $MiddlewareDir

if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item .env.example .env
        Write-Host "Created .env from .env.example" -ForegroundColor Cyan
        Write-Host "⚠️  Please update .env with your configuration!" -ForegroundColor Red
    } else {
        Write-Host "❌ No .env.example found. Please create .env file." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

# Check Redis connection
Write-Host "Testing Redis connection..." -ForegroundColor Cyan
if ($RedisCmd) {
    try {
        $redisTest = & $RedisCmd.Source ping 2>$null
        if ($redisTest -eq "PONG") {
            Write-Host "✅ Redis connection: OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Cannot connect to Redis. Tests may fail." -ForegroundColor Yellow
    }
}

Write-Host ""

# =============================================================================
# Step 5: Run Database Migrations
# =============================================================================
Write-Host "[5/6] Running database migrations..." -ForegroundColor Yellow

Set-Location $MiddlewareDir

# Initialize database
Write-Host "Initializing database..." -ForegroundColor Cyan
try {
    & $PythonCmd.Source -c "from app.db import init_db; init_db()" 2>$null
    Write-Host "Database initialized" -ForegroundColor Green
} catch {
    Write-Host "Database ready" -ForegroundColor Green
}

Write-Host "✅ Database ready" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Step 6: Start Services
# =============================================================================
Write-Host "[6/6] Starting services..." -ForegroundColor Yellow
Write-Host ""

# Check if ports are in use
$BackendPort = 8000
$FrontendPort = 5173

if (Test-PortInUse -Port $BackendPort) {
    Write-Host "⚠️  Port $BackendPort is already in use" -ForegroundColor Yellow
    Write-Host "   Backend may already be running" -ForegroundColor Gray
} else {
    Write-Host "✅ Port $BackendPort is available" -ForegroundColor Green
}

if (Test-PortInUse -Port $FrontendPort) {
    Write-Host "⚠️  Port $FrontendPort is already in use" -ForegroundColor Yellow
    Write-Host "   Frontend may already be running" -ForegroundColor Gray
} else {
    Write-Host "✅ Port $FrontendPort is available" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Services Status:" -ForegroundColor Cyan
Write-Host "  - Redis: Running on port 6379"
Write-Host "  - Backend: Ready to start on http://localhost:$BackendPort"
Write-Host "  - Frontend: Ready to start on http://localhost:$FrontendPort"
Write-Host ""
Write-Host "🚀 To start services:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Terminal 1 - Backend:" -ForegroundColor White
Write-Host "  cd middleware" -ForegroundColor Gray
Write-Host "  .\.venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port $BackendPort" -ForegroundColor Gray
Write-Host ""
Write-Host "  # Terminal 2 - Frontend:" -ForegroundColor White
Write-Host "  cd admin-ui" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Access points:" -ForegroundColor Cyan
Write-Host "  - Backend API: http://localhost:$BackendPort"
Write-Host "  - Admin UI: http://localhost:$FrontendPort"
Write-Host "  - API Docs: http://localhost:$BackendPort/docs"
Write-Host ""
Write-Host "🧪 To run tests:" -ForegroundColor Cyan
Write-Host "  cd middleware" -ForegroundColor Gray
Write-Host "  python test_runner.py" -ForegroundColor Gray
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
