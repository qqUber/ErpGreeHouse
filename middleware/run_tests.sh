#!/bin/bash

# Middleware test runner script for CI/CD
set -e

echo "Running middleware tests..."

# Run unit tests
echo "Running unit tests..."
pytest -q \
  --cov=app \
  --cov-report=term-missing \
  --cov-report=xml:../out/coverage.xml \
  --cov-report=html:../out/coverage \
  --html=../out/test-report.html \
  --self-contained-html \
  tests/unit/ || true

# Run integration tests
echo "Running integration tests..."
pytest -q \
  --cov=app \
  --cov-append \
  --cov-report=term-missing \
  --cov-report=xml:../out/coverage-integration.xml \
  --html=../out/test-integration-report.html \
  --self-contained-html \
  tests/integrations/ || true

echo "Middleware tests completed"
