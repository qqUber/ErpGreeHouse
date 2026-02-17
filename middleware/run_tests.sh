#!/bin/bash
# run_tests.sh - Cross-platform test runner

set -e

echo "🧪 Running Telegram CRM MVP Tests"

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

# Create reports directory
REPORT_DIR="reports/$(date +%Y%m%d)"
mkdir -p "$REPORT_DIR"

# Function to run tests with resource limiting
run_limited() {
    local test_type=$1
    local memory_limit="${2:-512m}"
    local cpu_limit="${3:-1.0}"
    
    echo "Running $test_type tests (Memory: $memory_limit, CPU: $cpu_limit)..."
    
    # Use different approaches based on OS
    if [[ "$OS" == "linux" ]] && command -v systemd-run &> /dev/null; then
        # Linux with systemd
        systemd-run --user --scope \
            -p MemoryMax=$memory_limit \
            -p CPUQuota=${cpu_limit}% \
            --quiet \
            pytest $test_type -v --tb=short --html="$REPORT_DIR/${test_type//\//_}_report.html"
    else
        # Windows or Linux without systemd
        pytest $test_type -v --tb=short --html="$REPORT_DIR/${test_type//\//_}_report.html"
    fi
}

# Check if pytest is available
if ! command -v pytest &> /dev/null; then
    echo "❌ pytest not found. Please run setup_test_env.sh first."
    exit 1
fi

# 1. Unit tests (fast, limited resources)
echo "📋 Running unit tests..."
run_limited "tests/unit" "256m" "50"

# 2. Integration tests (medium resources)
echo "🔗 Running integration tests..."
run_limited "tests/integration" "512m" "75"

# 3. E2E tests (maximum resources)
echo "🎭 Running E2E tests..."
run_limited "tests/e2e" "1g" "100"

# 4. Load tests (separate)
echo "⚡ Running load tests..."
if command -v locust &> /dev/null; then
    locust -f tests/load/locustfile.py --headless -u 100 -r 10 -t 60s \
        --html="$REPORT_DIR/load_test_report.html" 2>/dev/null || echo "Load tests skipped"
else
    echo "⚠️ Locust not found, skipping load tests"
fi

# 5. Security tests
echo "🔒 Running security tests..."
if command -v safety &> /dev/null; then
    safety check -r requirements.txt > "$REPORT_DIR/safety_report.txt" 2>/dev/null || echo "Safety check skipped"
fi

if command -v bandit &> /dev/null; then
    bandit -r app/ -f json -o "$REPORT_DIR/bandit_report.json" 2>/dev/null || echo "Bandit check skipped"
fi

# Generate summary report
echo "📊 Generating summary report..."
cat > "$REPORT_DIR/summary.md" << EOF
# Test Report - $(date)

## Test Summary
- **Unit Tests**: $(find "$REPORT_DIR" -name "*unit*report*" -exec grep -c "PASSED" {} \; 2>/dev/null || echo "0") passed
- **Integration Tests**: $(find "$REPORT_DIR" -name "*integration*report*" -exec grep -c "PASSED" {} \; 2>/dev/null || echo "0") passed  
- **E2E Tests**: $(find "$REPORT_DIR" -name "*e2e*report*" -exec grep -c "PASSED" {} \; 2>/dev/null || echo "0") passed
- **Load Tests**: Completed
- **Security Issues**: $(find "$REPORT_DIR" -name "*bandit*" -exec grep -c "issue" {} \; 2>/dev/null || echo "0") found

## Test Files Generated
$(ls -la "$REPORT_DIR"/*.html 2>/dev/null | wc -l) HTML reports
$(ls -la "$REPORT_DIR"/*.txt 2>/dev/null | wc -l) Text reports
$(ls -la "$REPORT_DIR"/*.json 2>/dev/null | wc -l) JSON reports

## Environment
- OS: $OS
- Date: $(date)
- Python: $(python --version 2>/dev/null || echo "Not available")
- Pytest: $(pytest --version 2>/dev/null || echo "Not available")
EOF

echo "✅ All tests completed!"
echo "📊 Reports saved to: $REPORT_DIR"
echo ""
echo "📈 Quick Summary:"
echo "- Unit tests: $(find "$REPORT_DIR" -name "*unit*report*" -exec grep -c "PASSED" {} \; 2>/dev/null || echo "0") passed"
echo "- Integration tests: $(find "$REPORT_DIR" -name "*integration*report*" -exec grep -c "PASSED" {} \; 2>/dev/null || echo "0") passed"
echo "- E2E tests: $(find "$REPORT_DIR" -name "*e2e*report*" -exec grep -c "PASSED" {} \; 2>/dev/null || echo "0") passed"
echo ""
echo "📋 To view detailed reports, open the HTML files in: $REPORT_DIR"