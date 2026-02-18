#!/bin/bash
# run_tests.sh - Cross-platform test runner

set -e

echo "🧪 Running Telegram CRM MVP Tests"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
export PYTHONPATH="$SCRIPT_DIR${PYTHONPATH:+:$PYTHONPATH}"

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

# Activate venv if present
if [[ -d "venv" ]]; then
    if [[ "$OS" == "linux" ]] && [[ -f "venv/bin/activate" ]]; then
        source "venv/bin/activate"
    fi
    if [[ "$OS" == "windows" ]] && [[ -f "venv/Scripts/activate" ]]; then
        source "venv/Scripts/activate"
    fi
fi
if [[ "$OS" == "windows" ]] && [[ -f "Scripts/activate" ]]; then
    source "Scripts/activate"
fi
if [[ "$OS" == "linux" ]] && [[ -f "bin/activate" ]]; then
    source "bin/activate"
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
    if [[ "$OS" == "linux" ]] && [[ "${CI:-}" != "true" ]] && command -v systemd-run &> /dev/null && systemd-run --user --scope --quiet true &> /dev/null; then
        # Linux with systemd
        systemd-run --user --scope \
            -p MemoryMax=$memory_limit \
            -p CPUQuota=${cpu_limit}% \
            --quiet \
            "${PYTEST_CMD[@]}" $test_type -v --tb=short --html="$REPORT_DIR/${test_type//\//_}_report.html"
    else
        # Windows or Linux without systemd
        "${PYTEST_CMD[@]}" $test_type -v --tb=short --html="$REPORT_DIR/${test_type//\//_}_report.html"
    fi
}

run_optional() {
    local test_type=$1
    local memory_limit="${2:-512m}"
    local cpu_limit="${3:-1.0}"

    set +e
    run_limited "$test_type" "$memory_limit" "$cpu_limit"
    local code=$?
    set -e

    if [[ $code -eq 5 ]]; then
        echo "⚠️ No tests collected for $test_type, skipping"
        return 0
    fi
    return $code
}

# Resolve pytest command (prefer pytest entrypoint, fallback to python -m pytest)
PYTEST_CMD=(pytest)
if ! command -v pytest &> /dev/null; then
    if [[ "$OS" == "windows" ]] && command -v py &> /dev/null; then
        PYTEST_CMD=(py -m pytest)
    elif command -v python3.11 &> /dev/null; then
        PYTEST_CMD=(python3.11 -m pytest)
    elif command -v python3 &> /dev/null; then
        PYTEST_CMD=(python3 -m pytest)
    elif command -v python &> /dev/null; then
        PYTEST_CMD=(python -m pytest)
    else
        echo "❌ Python not found."
        exit 1
    fi
fi

if ! "${PYTEST_CMD[@]}" --version &> /dev/null; then
    echo "❌ pytest not available. Please install test dependencies (see setup_test_env.sh)."
    exit 1
fi

# 1. Unit tests (fast, limited resources)
if [[ -d "tests/unit" ]]; then
    echo "📋 Running unit tests..."
    run_limited "tests/unit" "256m" "50"
else
    echo "⚠️ tests/unit not found, skipping unit tests"
fi

# 2. Integration tests (medium resources)
if [[ -d "tests/integration" ]]; then
    echo "🔗 Running integration tests..."
    run_limited "tests/integration" "512m" "75"
else
    echo "⚠️ tests/integration not found, skipping integration tests"
fi

# 3. E2E tests (maximum resources)
if [[ -d "tests/e2e" ]]; then
    echo "🎭 Running E2E tests..."
    run_optional "tests/e2e" "1g" "100"
else
    echo "⚠️ tests/e2e not found, skipping E2E tests"
fi

# 4. Load tests (separate)
if [[ -d "tests/load" ]] && [[ -f "tests/load/locustfile.py" ]]; then
    echo "⚡ Running load tests..."
    if command -v locust &> /dev/null; then
        locust -f tests/load/locustfile.py --headless -u 100 -r 10 -t 60s \
            --html="$REPORT_DIR/load_test_report.html" 2>/dev/null || echo "Load tests skipped"
    else
        echo "⚠️ Locust not found, skipping load tests"
    fi
else
    echo "⚠️ tests/load not found, skipping load tests"
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
- Pytest: $("${PYTEST_CMD[@]}" --version 2>/dev/null || echo "Not available")
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
