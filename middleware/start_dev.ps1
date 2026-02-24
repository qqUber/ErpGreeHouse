# ERP GreenHouse Development Startup Script
# This script clears cache, kills existing processes on port 8000, and starts the Uvicorn server
# Location: middleware/start_dev.ps1

param(
    [switch]$SkipRedisFlush = $false,
    [switch]$NoBrowser = $false
)

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Configuration
$PORT = 8000
$REDIS_HOST = "localhost"
$REDIS_PORT = 6379
$APP_MODULE = "app.main:app"

# Get JWT_SECRET_KEY from environment - fail if not set
if (-not $env:JWT_SECRET_KEY) {
    Write-Error-Msg "JWT_SECRET_KEY environment variable is not set."
    Write-Error-Msg "Please set it before running this script: $env:JWT_SECRET_KEY='your-secret-key'"
    exit 1
}

$DEV_ENVIRONMENT = "development"

# Get script directory and set working directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Function to write colored output
function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Msg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Banner
Write-Host @"


  ERP GreenHouse - Development Server Startup


"@ -ForegroundColor Magenta

# Step 1: Clear Redis/Memurai cache
if (-not $SkipRedisFlush) {
    Write-Step "Clearing Redis/Memurai cache..."
    
    try {
        # Try to flush Redis using Python script if available
        if (Test-Path "$ScriptDir\flush_redis.py") {
            python "$ScriptDir\flush_redis.py"
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Redis cache cleared successfully"
            } else {
                Write-Warning "Redis flush returned non-zero exit code (may not be running)"
            }
        } else {
            # Fallback: try direct redis-cli
            $redisCli = Get-Command redis-cli -ErrorAction SilentlyContinue
            if ($redisCli) {
                & redis-cli -h $REDIS_HOST -p $REDIS_PORT FLUSHALL 2>$null
                Write-Success "Redis cache cleared via redis-cli"
            } else {
                Write-Warning "Redis flush skipped - neither flush_redis.py nor redis-cli found"
            }
        }
    }
    catch {
        Write-Warning "Could not clear Redis cache: $_"
    }
} else {
    Write-Step "Skipping Redis cache flush (as requested)"
}

# Step 2: Kill existing processes on port 8000
Write-Step "Checking for existing processes on port $PORT..."

$connection = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue
if ($connection) {
    $processIds = $connection | Select-Object -ExpandProperty OwningProcess -Unique
    
    foreach ($processId in $processIds) {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) {
            Write-Warning "Killing process $processId ($($process.ProcessName)) on port $PORT"
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 500
        }
    }
    
    # Verify port is now free
    $connection = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Warning "Port $PORT still in use, attempting tree kill..."
        
        # If normal kill failed, try recursive tree kill
        foreach ($processId in $processIds) {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                $processName = $process.ProcessName
                Write-Warning "Tree killing all $processName processes..."
                
                # Try taskkill /F /IM for python/node processes
                if ($processName -eq "python" -or $processName -eq "python3" -or $processName -eq "node") {
                    taskkill /F /IM "$processName.exe" /T 2>$null
                } else {
                    taskkill /F /PID $processId /T 2>$null
                }
                Start-Sleep -Milliseconds 1000
            }
        }
        
        # Final verification
        $connection = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue
        if ($connection) {
            Write-Error-Msg "Failed to free port $PORT after tree kill"
            exit 1
        } else {
            Write-Success "Port $PORT is now free (after tree kill)"
        }
    } else {
        Write-Success "Port $PORT is now free"
    }
} else {
    Write-Success "Port $PORT is free (no processes running)"
}

# Step 3: Set environment variables for development
Write-Step "Setting environment variables..."

$env:ENVIRONMENT = $DEV_ENVIRONMENT
# JWT_SECRET_KEY already validated at startup, pass through
$env:REDIS_HOST = $REDIS_HOST
$env:REDIS_PORT = $REDIS_PORT

Write-Success "ENVIRONMENT=$env:ENVIRONMENT"
Write-Success "JWT_SECRET_KEY=<set>"
Write-Success "REDIS_HOST=$env:REDIS_HOST"
Write-Success "REDIS_PORT=$env:REDIS_PORT"

# Step 4: Start Uvicorn server
Write-Step "Starting Uvicorn development server..."

$uvicornArgs = @(
    "uvicorn",
    $APP_MODULE,
    "--host", "127.0.0.1",
    "--port", $PORT.ToString(),
    "--reload"
)

Write-Host "`nCommand: $($uvicornArgs -join ' ')" -ForegroundColor Gray
Write-Host "Working Directory: $ScriptDir`n" -ForegroundColor Gray

# Start the server
try {
    # Check if uvicorn is available
    $uvicornCheck = Get-Command uvicorn -ErrorAction SilentlyContinue
    if (-not $uvicornCheck) {
        Write-Error-Msg "Uvicorn not found. Please install it: pip install uvicorn"
        exit 1
    }
    
    Write-Success "Server starting at http://127.0.0.1:$PORT"
    Write-Success "API docs available at http://127.0.0.1:$PORT/docs"
    Write-Success "Admin UI available at http://127.0.0.1:$PORT/admin/"
    
    if (-not $NoBrowser) {
        Start-Sleep -Seconds 2
        Start-Process "http://127.0.0.1:$PORT"
    }
    
    # Execute uvicorn
    & uvicorn $APP_MODULE --host 127.0.0.1 --port $PORT --reload
}
catch {
    Write-Error-Msg "Failed to start server: $_"
    exit 1
}
