# setup_test_env.ps1 - Windows PowerShell Test Environment Setup

Write-Host "🚀 Setting up Telegram CRM MVP Test Environment (Windows)" -ForegroundColor Green

# Function to check if command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# 1. Python Installation Check
Write-Host "📦 Checking Python installation..." -ForegroundColor Yellow

if (Test-CommandExists "python3.11") {
    $PYTHON_CMD = "python3.11"
} elseif (Test-CommandExists "python3") {
    $PYTHON_CMD = "python3"
} elseif (Test-CommandExists "python") {
    $PYTHON_CMD = "python"
} else {
    Write-Host "❌ Python not found. Please install Python 3.11+ from python.org" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Using Python: $PYTHON_CMD" -ForegroundColor Green
& $PYTHON_CMD --version

# 2. Redis Installation Check
Write-Host "🔧 Checking Redis installation..." -ForegroundColor Yellow

if (!(Test-CommandExists "redis-server")) {
    Write-Host "⚠️ Redis not found." -ForegroundColor Yellow
    Write-Host "Please install Redis for Windows:"
    Write-Host "1. Download from: https://github.com/microsoftarchive/redis/releases"
    Write-Host "2. Install Redis-x64-3.2.100.msi"
    Write-Host "3. Start Redis service"
    
    $installRedis = Read-Host "Do you want to install Redis now? (y/n)"
    if ($installRedis -eq "y") {
        Start-Process "https://github.com/microsoftarchive/redis/releases"
        Write-Host "Please install Redis and run this script again." -ForegroundColor Yellow
        exit 0
    }
}

# Check if Redis is running
try {
    $redisTest = redis-cli ping 2>$null
    if ($redisTest -ne "PONG") {
        Write-Host "🔄 Starting Redis..." -ForegroundColor Yellow
        # Try to start Redis service
        Start-Service -Name "Redis" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
} catch {
    Write-Host "⚠️ Please ensure Redis is running manually" -ForegroundColor Yellow
}

# 3. Create Virtual Environment
Write-Host "🐍 Creating virtual environment..." -ForegroundColor Yellow
$VENV_DIR = "venv"

if (!(Test-Path $VENV_DIR)) {
    & $PYTHON_CMD -m venv $VENV_DIR
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✅ Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "⚡ Activating virtual environment..." -ForegroundColor Yellow
& ".\$VENV_DIR\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "📈 Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# 4. Install Dependencies
Write-Host "📚 Installing test dependencies..." -ForegroundColor Yellow

$packages = @(
    "pytest", "pytest-asyncio", "pytest-cov", "pytest-mock", "pytest-html",
    "playwright", "pytest-playwright",
    "locust",
    "safety", "bandit",
    "httpx", "aiohttp",
    "structlog"
)

foreach ($package in $packages) {
    Write-Host "Installing $package..." -ForegroundColor Gray
    pip install $package
}

# 5. Install Playwright Browsers
Write-Host "🎭 Installing Playwright browsers..." -ForegroundColor Yellow
try {
    playwright install chromium
} catch {
    Write-Host "⚠️ Playwright browser installation failed. You may need to install manually." -ForegroundColor Yellow
}

# 6. Create Test Environment File
Write-Host "⚙️ Creating test environment configuration..." -ForegroundColor Yellow

$envContent = @"
TELEGRAM_BOT_TOKEN=test_token_12345
REDIS_URL=redis://localhost:6379/1
WEBHOOK_SECRET=test_secret_key
BASE_WEB_URL=http://localhost:8000
ERP_API_BASE_URL=http://localhost:8000
ERP_API_KEY=test_api_key
ERP_API_SECRET=test_api_secret
ERP_MOCK_MODE=true
"@

$envContent | Out-File -FilePath ".env.test" -Encoding UTF8

# 7. Create Test Directory Structure
Write-Host "📁 Creating test directory structure..." -ForegroundColor Yellow

$testDirs = @("tests\unit", "tests\integration", "tests\e2e", "tests\load", "tests\security", "tests\fixtures", "reports\$(Get-Date -Format 'yyyyMMdd')")

foreach ($dir in $testDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# 8. Create Basic Test Files if they don't exist
$testFile = "tests\unit\test_erp_client.py"
if (!(Test-Path $testFile)) {
    Write-Host "📝 Creating basic unit tests..." -ForegroundColor Yellow
    
    $testContent = @"
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
"@
    
    $testContent | Out-File -FilePath $testFile -Encoding UTF8

# 9. Create PowerShell Test Scripts
Write-Host "📝 Creating PowerShell test scripts..." -ForegroundColor Yellow

# run_tests.ps1
$runTestsContent = @"
# run_tests.ps1 - Windows PowerShell Test Runner

Write-Host "🧪 Running Telegram CRM MVP Tests" -ForegroundColor Green

# Create reports directory
$reportDir = "reports\$(Get-Date -Format 'yyyyMMdd')"
New-Item -ItemType Directory -Path $reportDir -Force | Out-Null

# Run unit tests
Write-Host "📋 Running unit tests..." -ForegroundColor Yellow
pytest tests/unit -v --tb=short --html="$reportDir\unit_report.html"

# Run integration tests
Write-Host "🔗 Running integration tests..." -ForegroundColor Yellow
pytest tests/integration -v --tb=short --html="$reportDir\integration_report.html"

# Run E2E tests
Write-Host "🎭 Running E2E tests..." -ForegroundColor Yellow
pytest tests/e2e -v --tb=short --html="$reportDir\e2e_report.html"

Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host "📊 Reports saved to: $reportDir" -ForegroundColor Cyan
"@

$runTestsContent | Out-File -FilePath "run_tests.ps1" -Encoding UTF8

# collect_metrics.ps1
$collectMetricsContent = @"
# collect_metrics.ps1 - Windows PowerShell Metrics Collection

Write-Host "📊 Collecting Telegram CRM MVP Metrics" -ForegroundColor Green

# Create reports directory
$reportDir = "reports\$(Get-Date -Format 'yyyyMMdd')"
New-Item -ItemType Directory -Path $reportDir -Force | Out-Null

# System metrics
Write-Host "💻 Collecting system metrics..." -ForegroundColor Yellow
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, TotalPhysicalMemory | Out-File "$reportDir\system_info.log"
Get-Process | Where-Object {`$_.ProcessName -match "python|redis"} | Out-File "$reportDir\processes.log"

# Memory metrics
Write-Host "🧠 Collecting memory metrics..." -ForegroundColor Yellow
Get-WmiObject -Class Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory | Out-File "$reportDir\memory_usage.log"

# Redis metrics (if available)
if (Test-CommandExists "redis-cli") {
    Write-Host "🔄 Collecting Redis metrics..." -ForegroundColor Yellow
    redis-cli info 2>$null | Out-File "$reportDir\redis_info.log"
}

# Application health check
Write-Host "📱 Checking application health..." -ForegroundColor Yellow
try {
    `$response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    `$response | ConvertTo-Json | Out-File "$reportDir\app_health.log"
} catch {
    "Application not running" | Out-File "$reportDir\app_health.log"
}

Write-Host "✅ Metrics collection completed!" -ForegroundColor Green
Write-Host "📊 Reports saved to: $reportDir" -ForegroundColor Cyan
"@

$collectMetricsContent | Out-File -FilePath "collect_metrics.ps1" -Encoding UTF8

Write-Host "✅ Test environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Virtual environment is activated" -ForegroundColor White
Write-Host "2. Run tests: .\run_tests.ps1" -ForegroundColor White
Write-Host "3. Collect metrics: .\collect_metrics.ps1" -ForegroundColor White
Write-Host ""
Write-Host "📊 Environment info:" -ForegroundColor Cyan
Write-Host "Python: $(python --version)" -ForegroundColor White
Write-Host "Pip: $(pip --version)" -ForegroundColor White
Write-Host "Virtual Environment: $VENV_DIR" -ForegroundColor White

# Deactivate virtual environment on exit
Write-Host ""
Write-Host "💡 To deactivate virtual environment, run: deactivate" -ForegroundColor Yellow