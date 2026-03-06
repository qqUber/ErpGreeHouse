#!/bin/bash

# ErpGreeHouse Local Development Startup Script
# Usage: ./start-dev.sh

echo "========================================"
echo "  ErpGreeHouse Local Development"
echo "========================================"
echo ""

# Check if Docker is running
echo "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi
echo "Docker is running."

# Stop existing containers
echo ""
echo "Stopping existing containers..."
docker-compose -f docker-compose.local.yml down 2>/dev/null

# Start containers
echo ""
echo "Starting containers..."
docker-compose -f docker-compose.local.yml up --build -d

# Wait for services to be ready
echo ""
echo "Waiting for services..."
sleep 10

# Check backend health
echo ""
echo "Checking backend health..."
max_retries=30
retry=0
while [ $retry -lt $max_retries ]; do
    if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    sleep 2
    retry=$((retry + 1))
    echo -n "."
done

echo ""
echo "========================================"
echo "  Services are ready!"
echo "========================================"
echo ""
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:8000"
echo "Redis:     localhost:6379"
echo ""
echo "To view logs: docker-compose -f docker-compose.local.yml logs -f"
echo "To stop:     docker-compose -f docker-compose.local.yml down"
echo ""
