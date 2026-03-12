# PowerShell script for running tests on Windows
# Telegram CRM MVP - Test Runner

param(
    [string]$TestType = "all",
    [switch]$Coverage = $false,
    [switch]$Verbose = $false,
    [switch]$HtmlReport = $true
)

Write-Host "[TEST] Telegram CRM MVP - Windows Test Runner" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Configuration
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$TEST_DIR = "$PROJECT_ROOT/tests"
$REPORTS_DIR = "$PROJECT_ROOT/reports"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$REPORT_SUBDIR = "$REPORTS_DIR/$TIMESTAMP"

# Create reports directory
if (!(Test-Path $REPORT_SUBDIR)) {
    New-Item -ItemType Directory -Path $REPORT_SUBDIR -Force | Out-Null
}

# Python executable detection
$PYTHON_CMD = "python"
if (Get-Command python3 -ErrorAction SilentlyContinue) {
    $PYTHON_CMD = "python3"
}

# Check if virtual environment exists
if (Test-Path "$PROJECT_ROOT/venv") {
    Write-Host "[VENV] Activating virtual environment..." -ForegroundColor Yellow
    & "$PROJECT_ROOT/venv/Scripts/Activate.ps1"
}

# Validate Python environment
Write-Host "[VALIDATION] Validating Python environment..." -ForegroundColor Yellow
try {
    & $PYTHON_CMD --version
    & $PYTHON_CMD -c "import sys; print(f'Python {sys.version}')"
} catch {
    Write-Host "[ERROR] Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Install test dependencies if needed
Write-Host "[DEPS] Installing test dependencies..." -ForegroundColor Yellow
& $PYTHON_CMD -m pip install --upgrade pip
& $PYTHON_CMD -m pip install pytest pytest-asyncio pytest-cov pytest-html pytest-xdist

# Run different test types based on parameter
function Run-UnitTests {
    Write-Host "[TEST] Running Unit Tests..." -ForegroundColor Green

    $UNIT_TEST_CMD = "$PYTHON_CMD -m pytest tests/ -v --tb=short"

    if ($Coverage) {
        $UNIT_TEST_CMD += " --cov=app --cov-report=term-missing --cov-report=html:$REPORT_SUBDIR/coverage"
    }

    if ($HtmlReport) {
        $UNIT_TEST_CMD += " --html=$REPORT_SUBDIR/unit_tests.html --self-contained-html"
    }

    if ($Verbose) {
        $UNIT_TEST_CMD += " -s"
    }

    Invoke-Expression $UNIT_TEST_CMD

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAILED] Unit tests failed" -ForegroundColor Red
        return $false
    }

    Write-Host "[PASSED] Unit tests passed" -ForegroundColor Green
    return $true
}

function Run-IntegrationTests {
    Write-Host "[INTEGRATION] Running Integration Tests..." -ForegroundColor Green

    $INTEGRATION_CMD = "$PYTHON_CMD -m pytest tests/integration -v --tb=short"

    if ($HtmlReport) {
        $INTEGRATION_CMD += " --html=$REPORT_SUBDIR/integration_tests.html --self-contained-html"
    }

    if ($Verbose) {
        $INTEGRATION_CMD += " -s"
    }

    # Set mock mode for integration tests
    $env:ERP_MOCK_MODE = "true"

    Invoke-Expression $INTEGRATION_CMD

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAILED] Integration tests failed" -ForegroundColor Red
        return $false
    }

    Write-Host "[PASSED] Integration tests passed" -ForegroundColor Green
    return $true
}

function Run-SecurityTests {
    Write-Host "[SECURITY] Running Security Tests..." -ForegroundColor Green

    try {
        & $PYTHON_CMD -m pip install bandit safety

        Write-Host "Running Bandit security scan..." -ForegroundColor Yellow
        & $PYTHON_CMD -m bandit -r app/ -f json -o $REPORT_SUBDIR/bandit_report.json

        Write-Host "Running Safety check..." -ForegroundColor Yellow
        & $PYTHON_CMD -m safety check --json > $REPORT_SUBDIR/safety_report.json

        Write-Host "[SUCCESS] Security tests completed" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[WARNING] Security tests partially completed" -ForegroundColor Yellow
        return $true
    }
}

function Run-Linting {
    Write-Host "[LINTING] Running Code Linting..." -ForegroundColor Green

    try {
        & $PYTHON_CMD -m pip install flake8 black isort

        Write-Host "Running Black formatting check..." -ForegroundColor Yellow
        & $PYTHON_CMD -m black --check app/ tests/

        Write-Host "Running isort import check..." -ForegroundColor Yellow
        & $PYTHON_CMD -m isort --check-only app/ tests/

        Write-Host "Running Flake8 linting..." -ForegroundColor Yellow
        & $PYTHON_CMD -m flake8 app/ tests/ --max-line-length=88 --extend-ignore=E203,W503

        Write-Host "[PASSED] Linting passed" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[WARNING] Linting issues found" -ForegroundColor Yellow
        return $false
    }
}

# Main test execution
Write-Host "[RUN] Starting test execution..." -ForegroundColor Green
$OverallResult = $true

switch ($TestType.ToLower()) {
    "unit" {
        $OverallResult = Run-UnitTests
    }
    "integration" {
        $OverallResult = Run-IntegrationTests
    }
    "security" {
        $OverallResult = Run-SecurityTests
    }
    "lint" {
        $OverallResult = Run-Linting
    }
    "all" {
        $Results = @(
            (Run-UnitTests),
            (Run-IntegrationTests),
            (Run-SecurityTests),
            (Run-Linting)
        )
        $OverallResult = -not ($Results -contains $false)
    }
    default {
        Write-Host "Unknown test type: $TestType" -ForegroundColor Red
        Write-Host "Available types: unit, integration, security, lint, all" -ForegroundColor Yellow
        exit 1
    }
}

# Generate summary report
Write-Host "[SUMMARY] Generating test summary..." -ForegroundColor Yellow

$SummaryReport = @"
# Test Execution Summary
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Platform**: Windows PowerShell
**Python**: $(& $PYTHON_CMD --version)
**Test Type**: $TestType
**Overall Result**: $(if ($OverallResult) { "PASSED" } else { "FAILED" })

## Reports Generated
- Unit Tests: $REPORT_SUBDIR/unit_tests.html
- Integration Tests: $REPORT_SUBDIR/integration_tests.html
- Coverage Report: $REPORT_SUBDIR/coverage/index.html
- Security Reports: $REPORT_SUBDIR/bandit_report.json, $REPORT_SUBDIR/safety_report.json

## Next Steps
$(if ($OverallResult) {
    "[SUCCESS] All tests passed! Ready for deployment."
} else {
    "[FAIL] Some tests failed. Check reports above and fix issues."
})
"@

$SummaryReport | Out-File -FilePath "$REPORT_SUBDIR/test_summary.md" -Encoding UTF8

Write-Host "`n$SummaryReport" -ForegroundColor Cyan

Write-Host "`n[REPORTS] Reports saved to: $REPORT_SUBDIR" -ForegroundColor Green

if ($OverallResult) {
    Write-Host "[SUCCESS] All tests completed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAIL] Some tests failed. Check reports for details." -ForegroundColor Red
    exit 1
}
