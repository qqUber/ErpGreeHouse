#!/bin/bash
# Docker Playwright Screenshot Script
# Runs Playwright in Docker container for consistent screenshots

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Docker Playwright Screenshot Tool${NC}"
echo "================================================"

# Check if services are running
if ! curl -s http://localhost:5173 > /dev/null; then
    echo -e "${RED}❌ Frontend not running at http://localhost:5173${NC}"
    echo "Please start services first: docker-compose up"
    exit 1
fi

if ! curl -s http://localhost:8000 > /dev/null; then
    echo -e "${RED}❌ Backend not running at http://localhost:8000${NC}"
    echo "Please start services first: docker-compose up"
    exit 1
fi

echo -e "${GREEN}✅ Services are running${NC}"

# Create output directory
mkdir -p /tmp/docker-screenshots

# Run Playwright in Docker
echo -e "\n${BLUE}📸 Starting screenshot capture...${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy capture script to temp directory
cp "$SCRIPT_DIR/capture.sh" /tmp/docker-screenshots/

docker run --rm \
    --network host \
    -v "/tmp/docker-screenshots:/screenshots" \
    -e BASE_URL=http://localhost:5173 \
    -e ADMIN_USERNAME=admin \
    -e ADMIN_PASSWORD=admin \
    mcr.microsoft.com/playwright:v1.58.2-jammy \
    bash /screenshots/capture.sh

# Copy screenshots to project directory
echo -e "\n${BLUE}📁 Copying screenshots...${NC}"
cp -r /tmp/docker-screenshots/*.png ./exploration/screenshots/ 2>/dev/null || true

echo -e "${GREEN}✅ Screenshots captured successfully!${NC}"
echo -e "${BLUE}📁 Location: ./exploration/screenshots/${NC}"
