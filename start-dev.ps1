# ErpGreeHouse Local Development Startup Script
# Usage: .\start-dev.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ErpGreeHouse Local Development" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "Docker is running." -ForegroundColor Green

# Stop existing containers
Write-Host ""
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml down 2>$null

# Start containers
Write-Host ""
Write-Host "Starting containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml up --build -d

# Wait for services to be ready
Write-Host ""
Write-Host "Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check backend health
Write-Host ""
Write-Host "Checking backend health..." -ForegroundColor Yellow
$maxRetries = 30
$retry = 0
while ($retry -lt $maxRetries) {
    try {
        $health = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($health.StatusCode -eq 200) {
            Write-Host "Backend is ready!" -ForegroundColor Green
            break
        }
    } catch {}
    Start-Sleep -Seconds 2
    $retry++
    Write-Host "." -NoNewline
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services are ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "Redis:     localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "To view logs: docker-compose -f docker-compose.local.yml logs -f" -ForegroundColor Gray
Write-Host "To stop:     docker-compose -f docker-compose.local.yml down" -ForegroundColor Gray
Write-Host ""
