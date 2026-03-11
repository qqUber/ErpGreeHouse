#!/bin/bash
# Capture script that runs inside Docker container

set -e

BASE_URL=${BASE_URL:-"http://localhost:5173"}
ADMIN_USERNAME=${ADMIN_USERNAME:-"admin"}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-"admin"}
OUTPUT_DIR="/screenshots"

echo "🎭 Playwright Screenshot Capture (Docker)"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Output: $OUTPUT_DIR"
echo ""

# Create output directory
mkdir -p $OUTPUT_DIR

# Create package.json and install playwright
cd /tmp
cat > package.json << 'PKG'
{
  "name": "screenshot-capture",
  "version": "1.0.0",
  "dependencies": {
    "playwright": "^1.58.2"
  }
}
PKG

# Install dependencies (quietly)
echo "📦 Installing Playwright..."
npm install --silent 2>/dev/null

# Create Node.js script for screenshots
cat > capture.js << 'SCRIPT'
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';
const OUTPUT_DIR = '/screenshots';

const pages = [
  { name: '01-login', url: '/admin/', description: 'Login page' },
  { name: '02-dashboard', hash: '/admin/#/dashboard', description: 'Dashboard', needsLogin: true },
  { name: '03-customers', hash: '/admin/#/customers', description: 'Customers', needsLogin: true },
  { name: '04-pos', hash: '/admin/#/pos', description: 'POS', needsLogin: true },
  { name: '05-products', hash: '/admin/#/products', description: 'Products', needsLogin: true },
  { name: '06-marketing', hash: '/admin/#/marketing', description: 'Marketing', needsLogin: true },
  { name: '07-settings', hash: '/admin/#/settings', description: 'Settings', needsLogin: true },
  { name: '08-integrations', hash: '/admin/#/integrations', description: 'Integrations', needsLogin: true },
];

async function capture() {
  console.log('🚀 Launching browser...');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Login
  console.log('🔐 Logging in...');
  await page.goto(`${BASE_URL}/admin/`);
  await page.waitForSelector('[data-testid="common_input_username_en"]', { timeout: 10000 });
  await page.fill('[data-testid="common_input_username_en"]', ADMIN_USER);
  await page.fill('[data-testid="common_input_password_en"]', ADMIN_PASS);
  await page.click('[data-testid="common_btn_login_en"]');
  await page.waitForSelector('.widget-container', { timeout: 15000 });
  console.log('✅ Logged in\n');
  
  // Capture each page
  for (const config of pages) {
    try {
      console.log(`📸 ${config.name}: ${config.description}`);
      
      if (config.url) {
        await page.goto(`${BASE_URL}${config.url}`);
      } else if (config.hash) {
        await page.goto(`${BASE_URL}${config.hash}`);
      }
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      const filepath = `${OUTPUT_DIR}/${config.name}.png`;
      await page.screenshot({ path: filepath, fullPage: true });
      
      console.log(`  ✅ Saved: ${config.name}.png`);
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }
  
  await browser.close();
  console.log('\n✨ Capture complete!');
}

capture().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
SCRIPT

# Run the capture script
node capture.js
