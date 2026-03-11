#!/usr/bin/env node
/**
 * Advanced Screenshot Capture Script
 * 
 * Features:
 * - CLI interface with yargs
 * - Retry logic with exponential backoff
 * - Parallel execution
 * - Visual regression comparison
 * - JSON/HTML reporting
 * - Blank screenshot detection
 * 
 * Usage:
 *   node capture.cjs                    # Basic capture
 *   node capture.cjs --compare          # Compare against baselines
 *   node capture.cjs --update-baseline  # Update baseline images
 *   node capture.cjs --parallel 4       # Parallel execution
 *   node capture.cjs --json report.json # JSON output
 *   node capture.cjs --html report.html # HTML report
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Import modules
const config = require('./config.cjs');
const validators = require('./validators.cjs');
const comparators = require('./comparators.cjs');
const reporters = require('./reporters.cjs');

// Parse CLI arguments manually (avoiding yargs dependency for now)
const args = process.argv.slice(2);
const options = {
  compare: args.includes('--compare'),
  updateBaseline: args.includes('--update-baseline'),
  parallel: 1,
  json: null,
  html: null,
  verbose: args.includes('--verbose') || args.includes('-v'),
  mockData: args.includes('--mock-data'),
  prodData: args.includes('--prod-data'),
  diffDir: null,
};

// Parse --parallel N
const parallelIndex = args.indexOf('--parallel');
if (parallelIndex !== -1 && args[parallelIndex + 1]) {
  options.parallel = parseInt(args[parallelIndex + 1], 10) || 1;
}

// Parse --json path
const jsonIndex = args.indexOf('--json');
if (jsonIndex !== -1 && args[jsonIndex + 1]) {
  options.json = args[jsonIndex + 1];
}

// Parse --html path
const htmlIndex = args.indexOf('--html');
if (htmlIndex !== -1 && args[htmlIndex + 1]) {
  options.html = args[htmlIndex + 1];
}

// Parse --diff-dir
const diffDirIndex = args.indexOf('--diff-dir');
if (diffDirIndex !== -1 && args[diffDirIndex + 1]) {
  options.diffDir = args[diffDirIndex + 1];
}

// Ensure directories exist
[config.SCREENSHOT_DIR, config.BASELINE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Capture a single screenshot with retry logic
 */
async function captureScreenshot(page, pageConfig, attempt = 1) {
  const startTime = Date.now();
  const result = {
    name: pageConfig.name,
    description: pageConfig.description,
    success: false,
    timestamp: new Date().toISOString(),
    duration: 0,
    fileSize: 0,
    url: null,
    error: null,
    validation: null,
    retries: attempt - 1,
  };

  try {
    // Navigate or click nav selector
    if (pageConfig.url) {
      await page.goto(`${config.BASE_URL}${pageConfig.url}`, {
        timeout: config.NAVIGATION_TIMEOUT,
      });
    } else if (pageConfig.navSelector) {
      await page.click(pageConfig.navSelector);
    }

    // Wait for specific selector if defined
    if (pageConfig.waitForSelector) {
      try {
        await page.waitForSelector(pageConfig.waitForSelector, {
          timeout: config.SELECTOR_TIMEOUT,
        });
      } catch (e) {
        // Continue even if selector not found
        if (options.verbose) {
          console.log(`  ⚠️  Selector not found: ${pageConfig.waitForSelector}`);
        }
      }
    }

    // Execute pre-screenshot action if defined
    if (pageConfig.action) {
      await pageConfig.action(page);
    }

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');
    await sleep(800);

    // Capture screenshot
    const screenshotPath = path.join(config.SCREENSHOT_DIR, `${pageConfig.name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    // Validate screenshot
    const validation = await validators.validateScreenshot(screenshotPath);
    result.validation = validation;

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.reason}`);
    }

    // Get file info
    const stats = fs.statSync(screenshotPath);
    result.fileSize = stats.size;
    result.url = page.url();
    result.success = true;

  } catch (error) {
    result.error = error.message;
    
    // Retry logic
    if (attempt < config.MAX_RETRIES) {
      if (options.verbose) {
        console.log(`  🔄 Retrying ${pageConfig.name} (attempt ${attempt + 1}/${config.MAX_RETRIES})...`);
      }
      await sleep(config.RETRY_DELAY * attempt); // Exponential backoff
      return captureScreenshot(page, pageConfig, attempt + 1);
    }
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Process a batch of pages sequentially (for parallel execution)
 */
async function processBatch(browser, pages, batchIndex) {
  const context = await browser.newContext({
    viewport: config.VIEWPORT,
  });
  const page = await context.newPage();
  
  const results = [];
  
  // Login if needed
  const needsLogin = pages.some(p => p.requiresLogin);
  if (needsLogin) {
    try {
      await page.goto(`${config.BASE_URL}/admin/`);
      await page.waitForSelector('[data-testid="common_input_username_en"]', { timeout: 5000 });
      await page.fill('[data-testid="common_input_username_en"]', 'admin');
      await page.fill('[data-testid="common_input_password_en"]', 'admin');
      await page.click('[data-testid="common_btn_login_en"]');
      await page.waitForSelector('.widget-container', { timeout: 15000 });
    } catch (e) {
      console.error(`  ❌ Batch ${batchIndex}: Login failed - ${e.message}`);
      await context.close();
      return pages.map(p => ({
        name: p.name,
        success: false,
        error: 'Login failed',
      }));
    }
  }

  // Capture each page in batch
  for (const pageConfig of pages) {
    if (options.verbose) {
      console.log(`  📸 [Batch ${batchIndex}] Capturing: ${pageConfig.name}`);
    }
    
    const result = await captureScreenshot(page, pageConfig);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✅ ${pageConfig.name} (${(result.duration / 1000).toFixed(2)}s)`);
    } else {
      console.log(`  ❌ ${pageConfig.name}: ${result.error}`);
    }
  }

  await context.close();
  return results;
}

/**
 * Main capture function
 */
async function main() {
  console.log('🎭 Advanced Screenshot Capture');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  // Launch browser
  console.log('\n🚀 Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let allResults = [];

  // Determine execution strategy
  const parallelCount = Math.min(options.parallel, config.MAX_PARALLEL);
  
  if (parallelCount > 1) {
    console.log(`\n⚡ Parallel execution: ${parallelCount} workers`);
    
    // Split pages into batches
    const batches = [];
    for (let i = 0; i < config.pages.length; i += parallelCount) {
      batches.push(config.pages.slice(i, i + parallelCount));
    }

    // Process batches in parallel
    const batchPromises = batches.map((batch, index) => 
      processBatch(browser, batch, index + 1)
    );
    
    const batchResults = await Promise.all(batchPromises);
    allResults = batchResults.flat();
  } else {
    console.log('\n📸 Sequential execution');
    
    // Separate pages that need login vs those that don't
    const loginPages = config.pages.filter(p => p.requiresLogin !== false);
    const noLoginPages = config.pages.filter(p => p.requiresLogin === false);
    
    // First, capture pages that DON'T require login (fresh context each time)
    for (const pageConfig of noLoginPages) {
      const context = await browser.newContext({ viewport: config.VIEWPORT });
      const page = await context.newPage();
      
      console.log(`📸 ${pageConfig.name}: ${pageConfig.description}`);
      const result = await captureScreenshot(page, pageConfig);
      allResults.push(result);
      
      if (result.success) {
        console.log(`  ✅ Saved (${(result.duration / 1000).toFixed(2)}s)`);
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
      }
      
      await context.close();
    }
    
    // Then, capture pages that DO require login (single login session)
    if (loginPages.length > 0) {
      const context = await browser.newContext({ viewport: config.VIEWPORT });
      const page = await context.newPage();
      
      // Login once
      console.log('\n🔐 Logging in...');
      await page.goto(`${config.BASE_URL}/admin/`);
      await page.waitForSelector('[data-testid="common_input_username_en"]', { timeout: 5000 });
      await page.fill('[data-testid="common_input_username_en"]', 'admin');
      await page.fill('[data-testid="common_input_password_en"]', 'admin');
      await page.click('[data-testid="common_btn_login_en"]');
      await page.waitForSelector('.widget-container', { timeout: 15000 });
      console.log('✅ Logged in successfully\n');
      
      // Capture all login-required pages
      for (const pageConfig of loginPages) {
        console.log(`📸 ${pageConfig.name}: ${pageConfig.description}`);
        
        const result = await captureScreenshot(page, pageConfig);
        allResults.push(result);
        
        if (result.success) {
          console.log(`  ✅ Saved (${(result.duration / 1000).toFixed(2)}s)`);
        } else {
          console.log(`  ❌ Failed: ${result.error}`);
        }
      }
      
      await context.close();
    }
  }

  await browser.close();

  const totalDuration = Date.now() - startTime;

  // Comparison mode
  if (options.compare) {
    console.log('\n🔍 Running visual comparison...');
    
    if (!comparators.isPixelmatchAvailable()) {
      console.log('  ⚠️  pixelmatch not installed. Install with: npm install pixelmatch pngjs');
    } else {
      const comparisonResults = await comparators.compareAllScreenshots(
        config.SCREENSHOT_DIR,
        config.BASELINE_DIR,
        {
          threshold: config.DIFF_THRESHOLD,
          diffOutputDir: options.diffDir || path.join(config.SCREENSHOT_DIR, 'diffs'),
        }
      );

      const failed = comparisonResults.filter(r => r.diff);
      const passed = comparisonResults.filter(r => !r.diff);

      console.log(`  ✓ Passed: ${passed.length}`);
      console.log(`  ✗ Failed: ${failed.length}`);

      if (failed.length > 0) {
        console.log('\n  Failed comparisons:');
        failed.forEach(r => {
          if (r.error) {
            console.log(`    - ${r.name}: ${r.error}`);
          } else {
            console.log(`    - ${r.name}: ${(r.diffPercentage * 100).toFixed(2)}% diff`);
          }
        });
      }

      // Generate HTML report if requested
      if (options.html) {
        const html = reporters.generateComparisonReport(comparisonResults, {
          baselineDir: path.relative(process.cwd(), config.BASELINE_DIR),
          currentDir: path.relative(process.cwd(), config.SCREENSHOT_DIR),
          diffDir: options.diffDir ? path.relative(process.cwd(), options.diffDir) : null,
        });
        reporters.saveHTMLReport(html, options.html);
        console.log(`\n  📄 HTML report saved: ${options.html}`);
      }
    }
  }

  // Update baselines
  if (options.updateBaseline) {
    console.log('\n📦 Updating baselines...');
    const count = comparators.updateBaselines(config.SCREENSHOT_DIR, config.BASELINE_DIR);
    console.log(`  ✅ Updated ${count} baselines`);
  }

  // Generate reports
  console.log('\n📝 Generating reports...');
  
  // Console report
  reporters.consoleReport(allResults);

  // JSON report
  if (options.json) {
    reporters.generateJSONReport(allResults, options.json);
    console.log(`📄 JSON report saved: ${options.json}`);
  }

  // Summary
  const successCount = allResults.filter(r => r.success).length;
  console.log(`\n⏱️  Total time: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`📁 Screenshots: ${config.SCREENSHOT_DIR}`);
  console.log(`✅ Success rate: ${successCount}/${allResults.length} (${((successCount / allResults.length) * 100).toFixed(1)}%)`);

  // Exit with error code if any failed
  if (successCount < allResults.length) {
    process.exit(1);
  }
}

// Handle errors
main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
