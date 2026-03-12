#!/bin/bash
# collect_metrics.sh - Cross-platform metrics collection

# Create reports directory
REPORT_DIR="reports/$(date +%Y%m%d)"
mkdir -p "$REPORT_DIR"

echo "📊 Collecting Telegram CRM MVP Metrics"

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
else
    OS="unknown"
fi

# 1. System Metrics
echo "💻 Collecting system metrics..."

if [[ "$OS" == "linux" ]]; then
    # Linux system metrics
    if command -v sar &> /dev/null; then
        sar -u 1 5 > "$REPORT_DIR/cpu_usage.log" 2>/dev/null || echo "sar not available"
    else
        top -bn1 | head -20 > "$REPORT_DIR/cpu_usage.log"
    fi

    free -h > "$REPORT_DIR/memory_usage.log"
    df -h > "$REPORT_DIR/disk_usage.log"

    # Load average
    uptime > "$REPORT_DIR/load_average.log"

elif [[ "$OS" == "windows" ]]; then
    # Windows system metrics (if available)
    if command -v wmic &> /dev/null; then
        wmic cpu get loadpercentage /value > "$REPORT_DIR/cpu_usage.log" 2>/dev/null
        wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value > "$REPORT_DIR/memory_usage.log" 2>/dev/null
        wmic logicaldisk get size,freespace,caption > "$REPORT_DIR/disk_usage.log" 2>/dev/null
    else
        echo "Windows system metrics not available" > "$REPORT_DIR/system_info.log"
    fi
fi

# 2. Redis Metrics
echo "🔄 Collecting Redis metrics..."
if command -v redis-cli &> /dev/null; then
    redis-cli info > "$REPORT_DIR/redis_info.log" 2>/dev/null
    redis-cli --bigkeys > "$REPORT_DIR/redis_bigkeys.log" 2>/dev/null

    # Monitor Redis for 10 seconds
    timeout 10 redis-cli monitor > "$REPORT_DIR/redis_monitor.log" 2>/dev/null || true
else
    echo "Redis not available" > "$REPORT_DIR/redis_info.log"
fi

# 3. Application Metrics
echo "📱 Collecting application metrics..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    curl -s http://localhost:8000/health > "$REPORT_DIR/app_health.log"
    curl -s http://localhost:8000/metrics > "$REPORT_DIR/app_metrics.log" 2>/dev/null || echo "Metrics endpoint not available"
else
    echo "Application not running" > "$REPORT_DIR/app_health.log"
fi

# 4. Application Logs
echo "📝 Collecting application logs..."
if [[ -f "app.log" ]]; then
    tail -100 app.log > "$REPORT_DIR/app_recent.log"
fi
if [[ -f "error.log" ]]; then
    tail -50 error.log > "$REPORT_DIR/app_errors.log"
fi

# 5. Processes and Ports
echo "🔍 Collecting process and port information..."
if [[ "$OS" == "linux" ]]; then
    ps aux | grep -E "(python|redis|celery)" > "$REPORT_DIR/processes.log"
    netstat -tlnp 2>/dev/null | grep -E ":(8000|6379)" > "$REPORT_DIR/ports.log" || ss -tlnp | grep -E ":(8000|6379)" > "$REPORT_DIR/ports.log"
elif [[ "$OS" == "windows" ]]; then
    # Windows process info
    tasklist /FI "IMAGENAME eq python*" > "$REPORT_DIR/processes.log" 2>/dev/null
    netstat -ano | findstr ":8000\|:6379" > "$REPORT_DIR/ports.log" 2>/dev/null
fi

# 6. System Information
echo "ℹ️ Collecting system information..."
if [[ "$OS" == "linux" ]]; then
    uname -a > "$REPORT_DIR/system_info.log"
    lscpu 2>/dev/null | head -10 > "$REPORT_DIR/cpu_info.log" || cat /proc/cpuinfo | head -10 > "$REPORT_DIR/cpu_info.log"
elif [[ "$OS" == "windows" ]]; then
    systeminfo | head -20 > "$REPORT_DIR/system_info.log" 2>/dev/null
fi

# Python version
python --version > "$REPORT_DIR/python_version.log" 2>/dev/null || echo "Python not available" > "$REPORT_DIR/python_version.log"

# 7. Environment Variables (safe ones only)
echo "🔧 Collecting environment info..."
env | grep -E "(PATH|PYTHON|REDIS|ERP)" | grep -v "SECRET\|PASSWORD\|KEY" > "$REPORT_DIR/env_info.log" 2>/dev/null || echo "Environment info not available" > "$REPORT_DIR/env_info.log"

# 8. Test Results Summary (if available)
echo "📊 Checking for recent test results..."
LATEST_TEST_DIR=$(find reports/ -maxdepth 1 -type d -name "20*" | sort -r | head -1)
if [[ -n "$LATEST_TEST_DIR" ]]; then
    echo "Latest test directory: $LATEST_TEST_DIR" > "$REPORT_DIR/test_summary.log"
    find "$LATEST_TEST_DIR" -name "*report*" -exec basename {} \; > "$REPORT_DIR/test_files.log" 2>/dev/null
fi

# Generate comprehensive summary report
echo "📋 Generating comprehensive summary report..."
cat > "$REPORT_DIR/summary.md" << EOF
# System Metrics Report - $(date)

## Environment Overview
- **OS**: $OS
- **Hostname**: $(hostname 2>/dev/null || echo "unknown")
- **Date**: $(date)
- **Uptime**: $(uptime 2>/dev/null || echo "unknown")

## System Resources
### CPU Usage
$(if [[ "$OS" == "linux" ]]; then head -10 "$REPORT_DIR/cpu_usage.log" 2>/dev/null; else echo "See $REPORT_DIR/cpu_usage.log"; fi)

### Memory Usage
$(if [[ "$OS" == "linux" ]]; then cat "$REPORT_DIR/memory_usage.log" 2>/dev/null; else echo "See $REPORT_DIR/memory_usage.log"; fi)

### Disk Usage
$(if [[ "$OS" == "linux" ]]; then cat "$REPORT_DIR/disk_usage.log" 2>/dev/null; else echo "See $REPORT_DIR/disk_usage.log"; fi)

## Application Status
$(cat "$REPORT_DIR/app_health.log" 2>/dev/null || echo "Application not running")

## Redis Status
$(head -20 "$REPORT_DIR/redis_info.log" 2>/dev/null || echo "Redis not available")

## Key Processes
$(head -10 "$REPORT_DIR/processes.log" 2>/dev/null || echo "Process data not available")

## Open Ports
$(cat "$REPORT_DIR/ports.log" 2>/dev/null || echo "Port data not available")

## Recent Errors
$(tail -10 "$REPORT_DIR/app_errors.log" 2>/dev/null || echo "No recent errors")

## Test Results
$(if [[ -f "$REPORT_DIR/test_summary.log" ]]; then echo "Latest tests available in: $LATEST_TEST_DIR"; else echo "No recent test results"; fi)
EOF

# Create a simple dashboard HTML
cat > "$REPORT_DIR/dashboard.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Telegram CRM MVP - System Dashboard</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .good { background: #d4edda; border-left: 5px solid #28a745; }
        .warning { background: #fff3cd; border-left: 5px solid #ffc107; }
        .error { background: #f8d7da; border-left: 5px solid #dc3545; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Telegram CRM MVP - System Dashboard</h1>
        <p>Generated: $(date)</p>
    </div>

    <div class="metric">
        <h3>📊 System Overview</h3>
        <p><strong>OS:</strong> $OS</p>
        <p><strong>Hostname:</strong> $(hostname 2>/dev/null || echo "unknown")</p>
    </div>

    <div class="metric">
        <h3>📱 Application Status</h3>
        <p>$(cat "$REPORT_DIR/app_health.log" 2>/dev/null || echo "❌ Application not running")</p>
    </div>

    <div class="metric">
        <h3>🔄 Redis Status</h3>
        <p>$(if redis-cli ping 2>/dev/null; then echo "✅ Redis is running"; else echo "❌ Redis not available"; fi)</p>
    </div>

    <div class="metric">
        <h3>📝 Recent Activity</h3>
        <p>Check the detailed logs in: $REPORT_DIR/</p>
    </div>

    <div class="metric">
        <h3>🔗 Quick Links</h3>
        <ul>
            <li><a href="summary.md">📋 Summary Report</a></li>
            <li><a href="app_health.log">🏥 Application Health</a></li>
            <li><a href="redis_info.log">🔄 Redis Info</a></li>
            <li><a href="processes.log">⚙️ Processes</a></li>
            <li><a href="ports.log">🔌 Open Ports</a></li>
        </ul>
    </div>
</body>
</html>
EOF

echo "✅ Metrics collection completed!"
echo "📊 Reports saved to: $REPORT_DIR"
echo ""
echo "📈 Quick Summary:"
echo "- OS: $OS"
echo "- Application: $(cat "$REPORT_DIR/app_health.log" 2>/dev/null || echo "Not running")"
echo "- Redis: $(if redis-cli ping 2>/dev/null; then echo "Running"; else echo "Not available"; fi)"
echo "- Reports: $(ls -1 "$REPORT_DIR"/*.log 2>/dev/null | wc -l) log files"
echo "- Dashboard: $REPORT_DIR/dashboard.html"
echo ""
echo "📋 To view the dashboard, open: $REPORT_DIR/dashboard.html in your browser"
