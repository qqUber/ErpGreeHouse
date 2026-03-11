/**
 * Screenshot Reporting
 * Generate JSON metadata and HTML reports
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate JSON report with screenshot metadata
 * @param {Array<Object>} results - Screenshot capture results
 * @param {string} outputPath - Path to save JSON report
 */
function generateJSONReport(results, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      duration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
    },
    screenshots: results.map(r => ({
      name: r.name,
      description: r.description,
      success: r.success,
      duration: r.duration,
      fileSize: r.fileSize,
      url: r.url,
      timestamp: r.timestamp,
      error: r.error || null,
      validation: r.validation || null,
    })),
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  return report;
}

/**
 * Generate HTML report for visual comparison
 * @param {Array<Object>} comparisonResults - Visual diff results
 * @param {Object} options - Report options
 * @returns {string} HTML content
 */
function generateComparisonReport(comparisonResults, options = {}) {
  const { 
    baselineDir = 'baselines',
    currentDir = 'screenshots',
    diffDir = null,
    title = 'Visual Regression Report',
  } = options;

  const failedTests = comparisonResults.filter(r => r.diff);
  const passedTests = comparisonResults.filter(r => !r.diff);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header h1 { margin-bottom: 10px; }
    .stats { display: flex; gap: 20px; margin-top: 15px; }
    .stat { padding: 10px 15px; border-radius: 6px; font-weight: 600; }
    .stat.pass { background: #d4edda; color: #155724; }
    .stat.fail { background: #f8d7da; color: #721c24; }
    .comparison { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .comparison-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .comparison-title { font-size: 18px; font-weight: 600; }
    .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status.pass { background: #d4edda; color: #155724; }
    .status.fail { background: #f8d7da; color: #721c24; }
    .diff-info { color: #666; font-size: 14px; margin-bottom: 15px; }
    .images { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
    .image-container { border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
    .image-label { background: #f8f9fa; padding: 8px 12px; font-size: 12px; font-weight: 600; border-bottom: 1px solid #ddd; }
    .image-container img { width: 100%; height: auto; display: block; }
    .error { color: #dc3545; font-size: 14px; margin-top: 10px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 20px; font-weight: 600; margin-bottom: 15px; color: #333; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <div class="stats">
      <div class="stat pass">✓ Passed: ${passedTests.length}</div>
      <div class="stat fail">✗ Failed: ${failedTests.length}</div>
      <div class="stat">Total: ${comparisonResults.length}</div>
    </div>
  </div>

  ${failedTests.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Failed Comparisons</h2>
    ${failedTests.map(result => `
    <div class="comparison">
      <div class="comparison-header">
        <span class="comparison-title">${result.name}</span>
        <span class="status fail">Failed</span>
      </div>
      <div class="diff-info">
        ${result.error 
          ? `<div class="error">Error: ${result.error}</div>`
          : `Difference: ${(result.diffPercentage * 100).toFixed(2)}% (${result.diffPixels?.toLocaleString()} pixels)`
        }
      </div>
      <div class="images">
        <div class="image-container">
          <div class="image-label">Baseline</div>
          <img src="${path.join(baselineDir, result.name)}" alt="Baseline" onerror="this.style.display='none'">
        </div>
        <div class="image-container">
          <div class="image-label">Current</div>
          <img src="${path.join(currentDir, result.name)}" alt="Current" onerror="this.style.display='none'">
        </div>
        ${result.diffPath ? `
        <div class="image-container">
          <div class="image-label">Diff</div>
          <img src="${result.diffPath}" alt="Diff" onerror="this.style.display='none'">
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  ${passedTests.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Passed Comparisons</h2>
    ${passedTests.map(result => `
    <div class="comparison">
      <div class="comparison-header">
        <span class="comparison-title">${result.name}</span>
        <span class="status pass">Passed</span>
      </div>
      <div class="images">
        <div class="image-container">
          <div class="image-label">Screenshot</div>
          <img src="${path.join(currentDir, result.name)}" alt="Current" onerror="this.style.display='none'">
        </div>
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}
</body>
</html>`;

  return html;
}

/**
 * Save HTML report to file
 * @param {string} html - HTML content
 * @param {string} outputPath - Output file path
 */
function saveHTMLReport(html, outputPath) {
  fs.writeFileSync(outputPath, html);
  return outputPath;
}

/**
 * Console reporter for CLI output
 * @param {Array<Object>} results - Screenshot results
 */
function consoleReport(results) {
  const success = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('\n' + '='.repeat(60));
  console.log('SCREENSHOT CAPTURE REPORT');
  console.log('='.repeat(60));
  console.log(`\nTotal: ${results.length} screenshots`);
  console.log(`✓ Passed: ${success.length}`);
  console.log(`✗ Failed: ${failed.length}`);
  console.log(`Duration: ${(results.reduce((sum, r) => sum + (r.duration || 0), 0) / 1000).toFixed(2)}s`);

  if (failed.length > 0) {
    console.log('\n--- Failed Screenshots ---');
    failed.forEach(r => {
      console.log(`  ✗ ${r.name}: ${r.error || 'Unknown error'}`);
    });
  }

  if (success.length > 0) {
    console.log('\n--- Passed Screenshots ---');
    success.forEach(r => {
      const size = r.fileSize ? `(${(r.fileSize / 1024).toFixed(1)}KB)` : '';
      console.log(`  ✓ ${r.name} ${size}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

module.exports = {
  generateJSONReport,
  generateComparisonReport,
  saveHTMLReport,
  consoleReport,
};
