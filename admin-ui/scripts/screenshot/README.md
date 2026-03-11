# Screenshot Automation Tool

Advanced screenshot capture and visual regression testing for ERP Greenhouse admin-ui.

## Features

- ✅ **CLI Interface** - Easy command-line usage
- ✅ **Retry Logic** - Exponential backoff for flaky operations (3 retries)
- ✅ **Validation** - Detects blank/white screenshots
- ✅ **Visual Regression** - Compare against baselines with pixelmatch
- ✅ **Parallel Execution** - Capture multiple pages simultaneously
- ✅ **JSON/HTML Reports** - Detailed reporting
- ✅ **Dual Data Mode** - Mock and production data support

## Quick Start

```bash
# Install dependencies
npm install

# Capture all screenshots
npm run screenshot

# Compare against baselines
npm run screenshot:compare

# Update baseline images
npm run screenshot:baseline

# Run in parallel (faster)
npm run screenshot:parallel
```

## Command Line Options

```bash
node scripts/screenshot/capture.cjs [options]

Options:
  --compare           Compare screenshots against baselines
  --update-baseline   Update baseline images from current screenshots
  --parallel N        Run N pages in parallel (default: 1)
  --json PATH         Save JSON report to PATH
  --html PATH         Save HTML comparison report to PATH
  --diff-dir PATH     Save diff images to PATH
  --mock-data         Use mocked data (consistent)
  --prod-data         Use production data (default)
  --verbose, -v       Show detailed output
```

## Examples

### Basic Capture
```bash
npm run screenshot
# or
node scripts/screenshot/capture.cjs
```

### Visual Regression Testing
```bash
# First, update baselines after intentional changes
npm run screenshot:baseline

# Then compare future screenshots against baselines
npm run screenshot:compare

# With HTML report
node scripts/screenshot/capture.cjs --compare --html visual-report.html
```

### Parallel Execution (4x faster)
```bash
npm run screenshot:parallel
# or
node scripts/screenshot/capture.cjs --parallel 4
```

### Generate Reports
```bash
# JSON report only
node scripts/screenshot/capture.cjs --json report.json

# Both JSON and HTML
node scripts/screenshot/capture.cjs --compare --json report.json --html report.html
```

## Configuration

Edit `scripts/screenshot/config.cjs` to customize:

- **Pages to capture** - Add/modify page definitions
- **Selectors** - Navigation and wait selectors
- **Retry settings** - Max retries and delay
- **Viewport** - Screen dimensions
- **Validation** - Minimum colors threshold
- **Diff threshold** - 0.1% pixel difference

### Page Configuration Example

```javascript
{
  name: '04-dashboard',
  navSelector: '[data-testid="admin_nav_dashboard_en"]',
  description: 'Dashboard with widgets',
  requiresLogin: true,
  waitForSelector: '.widget-container',
  action: async (page) => {
    // Custom actions before screenshot
    await page.click('.widget');
  },
}
```

## Directory Structure

```
exploration/
├── screenshots/          # Current screenshots
├── baselines/            # Golden master images (git tracked)
└── diffs/                # Visual diff images (generated)
```

## Output

### Console Report
```
============================================================
SCREENSHOT CAPTURE REPORT
============================================================

Total: 11 screenshots
✓ Passed: 11
✗ Failed: 0
Duration: 29.38s

--- Passed Screenshots ---
  ✓ 01-login (44.7KB)
  ✓ 02-login-filled (46.8KB)
  ...

⏱️  Total time: 30.59s
📁 Screenshots: /path/to/screenshots
✅ Success rate: 11/11 (100.0%)
```

### JSON Report
```json
{
  "timestamp": "2026-03-10T20:40:35.923Z",
  "summary": {
    "total": 11,
    "passed": 11,
    "failed": 0,
    "duration": 29381
  },
  "screenshots": [
    {
      "name": "01-login",
      "description": "Login page",
      "success": true,
      "duration": 1855,
      "fileSize": 45746,
      "url": "http://localhost:5173/admin/",
      "validation": { "valid": true, "uniqueColors": 77 }
    }
  ]
}
```

## Visual Regression Workflow

### 1. Initial Baseline Setup
```bash
# After UI is stable, create baselines
npm run screenshot
npm run screenshot:baseline
git add exploration/baselines/
git commit -m "Add screenshot baselines"
```

### 2. Daily Development
```bash
# Make your changes...
# Then verify no visual regressions
npm run screenshot:compare
```

### 3. Handle Changes
```bash
# If changes are intentional, update baselines
npm run screenshot:baseline
git add exploration/baselines/
git commit -m "Update baselines for new feature"
```

## CI/CD Integration

Add to your GitHub Actions:

```yaml
- name: Capture Screenshots
  run: npm run screenshot

- name: Compare Screenshots
  run: npm run screenshot:compare
  continue-on-error: true

- name: Upload Screenshots
  uses: actions/upload-artifact@v3
  with:
    name: screenshots
    path: exploration/screenshots/
```

## Troubleshooting

### Blank Screenshots
- Check that the server is running: `docker-compose up`
- Verify selectors in config.cjs match actual page elements
- Increase wait timeout in config

### Visual Diff Failures
- Check if changes are intentional
- Update baselines if needed: `npm run screenshot:baseline`
- Review diff images in `exploration/diffs/`

### Timeout Errors
- Increase NAVIGATION_TIMEOUT in config.cjs
- Check network connectivity
- Verify backend is responding

### Permission Errors
```bash
chmod +x scripts/screenshot/capture.cjs
```

## Pages Captured

1. **01-login** - Login page
2. **02-login-filled** - Login form with credentials
3. **03-login-error** - Login error state
4. **04-dashboard** - Dashboard with widgets
5. **05-customers** - Customers list
6. **06-pos** - POS/Sales form
7. **07-products** - Products catalog
8. **08-marketing** - Marketing campaigns
9. **09-settings** - Settings page
10. **10-integrations** - Integrations page
11. **11-widget-expanded** - Dashboard with expanded widget

## Requirements

- Node.js 18+
- Playwright (Chromium)
- pixelmatch & pngjs (for visual comparison)
- Running backend (for production data mode)

## License

Same as project
