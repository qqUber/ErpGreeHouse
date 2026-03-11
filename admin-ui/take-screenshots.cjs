#!/usr/bin/env node
/**
 * Screenshot Automation Script for ERP Greenhouse
 * 
 * Usage:
 *   1. Ensure services are running: docker-compose up
 *   2. Run: node take-screenshots.cjs
 *   3. Screenshots saved to ./exploration/screenshots/
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'exploration', 'screenshots');

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Pages to capture with navigation tab selectors
const pages = [
  { 
    name: '01-login', 
    url: '/admin/',
    description: 'Login page'
  },
  { 
    name: '02-login-filled', 
    url: '/admin/',
    action: async (page) => {
      await page.fill('[data-testid="common_input_username_en"]', 'admin');
      await page.fill('[data-testid="common_input_password_en"]', 'admin');
    },
    description: 'Login form filled'
  },
  { 
    name: '03-dashboard', 
    navSelector: '[data-testid="admin_nav_dashboard_en"]',
    waitForSelector: '.widget-container',
    requiresLogin: true,
    description: 'Dashboard with widgets'
  },
  { 
    name: '04-customers', 
    navSelector: '[data-testid="admin_nav_customers_en"]',
    waitForSelector: '[data-testid="customers-table"]',
    requiresLogin: true,
    description: 'Customers list'
  },
  { 
    name: '05-pos', 
    navSelector: '[data-testid="admin_nav_pos_en"]',
    waitForSelector: '.pos-container',
    requiresLogin: true,
    description: 'POS/Sales form'
  },
  { 
    name: '06-products', 
    navSelector: '[data-testid="admin_nav_products_en"]',
    waitForSelector: '.products-list',
    requiresLogin: true,
    description: 'Products table'
  },
  { 
    name: '07-marketing', 
    navSelector: '[data-testid="admin_nav_marketing_en"]',
    waitForSelector: '.marketing-container',
    requiresLogin: true,
    description: 'Marketing page'
  },
  { 
    name: '08-settings', 
    navSelector: '[data-testid="admin_nav_settings_en"]',
    waitForSelector: '.settings-container',
    requiresLogin: true,
    description: 'Settings page'
  },
  { 
    name: '09-integrations', 
    navSelector: '[data-testid="admin_nav_integrations_en"]',
    waitForSelector: '.integrations-list',
    requiresLogin: true,
    description: 'Integrations page'
  },
];

async function takeScreenshots() {
  console.log('🎭 Starting screenshot capture...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  // Login once and save state
  console.log('🔐 Logging in...');
  await page.goto(`${BASE_URL}/admin/`);
  await page.waitForSelector('[data-testid="common_input_username_en"]', { timeout: 5000 });
  await page.fill('[data-testid="common_input_username_en"]', 'admin');
  await page.fill('[data-testid="common_input_password_en"]', 'admin');
  
  // Click login and wait for navigation
  await page.click('[data-testid="common_btn_login_en"]');
  
  // Wait for dashboard to load by checking for widget-container
  await page.waitForSelector('.widget-container', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  
  // Save logged-in state
  await context.storageState({ path: 'auth.json' });
  console.log('✅ Logged in successfully\n');
  
  // Take screenshots
  for (const screenshotConfig of pages) {
    try {
      console.log(`📸 Capturing: ${screenshotConfig.name} - ${screenshotConfig.description}`);
      
      if (screenshotConfig.url) {
        // Regular URL navigation for login pages
        await page.goto(`${BASE_URL}${screenshotConfig.url}`);
      } else if (screenshotConfig.navSelector) {
        // Click navigation tab
        await page.click(screenshotConfig.navSelector);
        // Wait for page-specific content
        if (screenshotConfig.waitForSelector) {
          try {
            await page.waitForSelector(screenshotConfig.waitForSelector, { timeout: 5000 });
          } catch (e) {
            // Some selectors might not exist, continue anyway
            console.log(`   ⚠️  Selector ${screenshotConfig.waitForSelector} not found, continuing...`);
          }
        }
      }
      
      // Execute pre-screenshot action if defined
      if (screenshotConfig.action) {
        await screenshotConfig.action(page);
      }
      
      // Wait for page to stabilize
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      
      // Take full-page screenshot
      const filepath = path.join(SCREENSHOT_DIR, `${screenshotConfig.name}.png`);
      await page.screenshot({ 
        path: filepath, 
        fullPage: true 
      });
      
      console.log(`   ✅ Saved: ${screenshotConfig.name}.png`);
    } catch (error) {
      console.error(`   ❌ Failed: ${screenshotConfig.name}`, error.message);
    }
  }
  
  // Additional detail screenshots
  console.log('\n🔍 Capturing detail views...');
  
  // Widget expanded view
  try {
    await page.click('[data-testid="admin_nav_dashboard_en"]');
    await page.waitForSelector('.widget-container', { timeout: 5000 });
    const widget = await page.locator('.widget-container').first();
    await widget.click();
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '10-widget-expanded.png'),
      fullPage: false
    });
    console.log('   ✅ Saved: 10-widget-expanded.png');
  } catch (e) {
    console.log('   ⚠️  Widget expansion failed');
  }
  
  // Error state
  try {
    await page.goto(`${BASE_URL}/admin/`);
    await page.click('[data-testid="common_btn_login_en"]');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '11-login-error.png'),
      fullPage: false
    });
    console.log('   ✅ Saved: 11-login-error.png');
  } catch (e) {
    console.log('   ⚠️  Error state capture failed');
  }
  
  await browser.close();
  
  console.log('\n✨ Screenshot capture complete!');
  console.log(`📁 Saved to: ${SCREENSHOT_DIR}`);
  console.log('\nNext steps:');
  console.log('  1. Review screenshots in exploration/screenshots/');
  console.log('  2. Use for visual comparison during refactoring');
  console.log('  3. Identify UI inconsistencies\n');
}

takeScreenshots().catch(err => {
  console.error('❌ Screenshot failed:', err);
  process.exit(1);
});
