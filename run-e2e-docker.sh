#!/bin/bash

# E2E Test Runner with Docker
# This script runs E2E tests in Docker containers

set -e

echo "=== E2E Test Runner ==="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running"
    exit 1
fi

# Build and start services
echo "Building and starting services..."
docker-compose -f docker-compose.e2e.yml down -v 2>/dev/null || true
docker-compose -f docker-compose.e2e.yml build
docker-compose -f docker-compose.e2e.yml up -d redis-e2e backend-e2e frontend-e2e

# Wait for services to be healthy
echo "Waiting for services..."
sleep 10

# Seed test data
echo "Seeding test data..."
curl -s -X POST http://localhost:8000/api/v1/test/seed \
    -H "x-admin-secret: test-secret-key" || echo "Seed may have already run"

# Run E2E tests
echo "Running E2E tests..."
docker-compose -f docker-compose.e2e.yml run --rm e2e-runner

# Copy screenshots
echo "Copying screenshots..."
mkdir -p screenshots
docker cp erp_e2e_runner:/app/screenshots/. ./screenshots/ || true

# Cleanup
echo "Cleaning up..."
docker-compose -f docker-compose.e2e.yml down -v

echo "=== Done ==="
