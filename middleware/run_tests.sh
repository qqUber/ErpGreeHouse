#!/bin/bash

# Middleware test runner script for CI/CD
set -e

echo "Running middleware tests..."

# Ensure reports directory exists
mkdir -p reports

# Run unit tests
echo "Running unit tests..."
pytest -q \
  --cov=app \
  --cov-report=term-missing \
  --cov-report=xml:reports/coverage.xml \
  --cov-report=html:reports/coverage \
  --html=reports/test-report.html \
  --self-contained-html \
  tests/unit/

# Run integration tests
echo "Running integration tests..."
pytest -q \
  --cov=app \
  --cov-append \
  --cov-report=term-missing \
  --cov-report=xml:reports/coverage-integration.xml \
  --html=reports/test-integration-report.html \
  --self-contained-html \
  tests/integrations/

echo "Middleware tests completed"
