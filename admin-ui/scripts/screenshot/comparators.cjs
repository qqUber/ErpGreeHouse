/**
 * Visual Comparison Utilities
 * Compare screenshots against baselines using pixelmatch
 */

const fs = require('fs');
const path = require('path');

// Check if pixelmatch is available
let pixelmatch;
let PNG;

try {
  pixelmatch = require('pixelmatch');
  PNG = require('pngjs').PNG;
} catch (e) {
  // pixelmatch not installed, will use fallback
}

/**
 * Compare two screenshots visually
 * @param {string} baselinePath - Path to baseline image
 * @param {string} currentPath - Path to current screenshot
 * @param {Object} options - Comparison options
 * @returns {Promise<{diff: boolean, diffPercentage: number, diffPath?: string, error?: string}>}
 */
async function compareScreenshots(baselinePath, currentPath, options = {}) {
  const { 
    threshold = 0.001, // 0.1% different pixels
    diffOutputDir = null,
    includeAA = false,
    alpha = 0.1,
    aaColor = [255, 255, 0],
    diffColor = [255, 0, 255],
  } = options;

  // Check if pixelmatch is available
  if (!pixelmatch || !PNG) {
    return {
      diff: false,
      diffPercentage: 0,
      error: 'pixelmatch not installed. Run: npm install pixelmatch pngjs',
    };
  }

  try {
    // Read images
    if (!fs.existsSync(baselinePath)) {
      return {
        diff: true,
        diffPercentage: 100,
        error: `Baseline not found: ${baselinePath}`,
      };
    }

    if (!fs.existsSync(currentPath)) {
      return {
        diff: true,
        diffPercentage: 100,
        error: `Current screenshot not found: ${currentPath}`,
      };
    }

    const baselineImg = PNG.sync.read(fs.readFileSync(baselinePath));
    const currentImg = PNG.sync.read(fs.readFileSync(currentPath));

    // Check dimensions
    if (baselineImg.width !== currentImg.width || baselineImg.height !== currentImg.height) {
      return {
        diff: true,
        diffPercentage: 100,
        error: `Dimension mismatch: ${baselineImg.width}x${baselineImg.height} vs ${currentImg.width}x${currentImg.height}`,
      };
    }

    // Create diff image
    const diff = new PNG({ width: baselineImg.width, height: baselineImg.height });

    // Compare
    const diffPixels = pixelmatch(
      baselineImg.data,
      currentImg.data,
      diff.data,
      baselineImg.width,
      baselineImg.height,
      {
        threshold: 0.1, // Color threshold (0-1)
        includeAA,
        alpha,
        aaColor,
        diffColor,
      }
    );

    const totalPixels = baselineImg.width * baselineImg.height;
    const diffPercentage = diffPixels / totalPixels;

    // Save diff image if there are differences
    let diffPath = null;
    if (diffPixels > 0 && diffOutputDir) {
      if (!fs.existsSync(diffOutputDir)) {
        fs.mkdirSync(diffOutputDir, { recursive: true });
      }
      
      const basename = path.basename(currentPath, '.png');
      diffPath = path.join(diffOutputDir, `${basename}-diff.png`);
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }

    return {
      diff: diffPercentage > threshold,
      diffPercentage,
      diffPixels,
      totalPixels,
      diffPath,
      threshold,
    };
  } catch (error) {
    return {
      diff: true,
      diffPercentage: 100,
      error: error.message,
    };
  }
}

/**
 * Compare all screenshots in a directory against baselines
 * @param {string} currentDir - Directory with current screenshots
 * @param {string} baselineDir - Directory with baseline images
 * @param {Object} options - Comparison options
 * @returns {Promise<Array<Object>>}
 */
async function compareAllScreenshots(currentDir, baselineDir, options = {}) {
  const results = [];

  if (!fs.existsSync(currentDir)) {
    return results;
  }

  const files = fs.readdirSync(currentDir).filter(f => f.endsWith('.png'));

  for (const file of files) {
    const currentPath = path.join(currentDir, file);
    const baselinePath = path.join(baselineDir, file);
    
    const comparison = await compareScreenshots(baselinePath, currentPath, options);
    
    results.push({
      name: file,
      ...comparison,
    });
  }

  return results;
}

/**
 * Copy current screenshots to baseline directory
 * @param {string} currentDir - Source directory
 * @param {string} baselineDir - Target directory
 * @param {Array<string>} files - Specific files to copy (optional, defaults to all)
 */
function updateBaselines(currentDir, baselineDir, files = null) {
  if (!fs.existsSync(currentDir)) {
    throw new Error(`Current directory not found: ${currentDir}`);
  }

  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });
  }

  const filesToCopy = files || fs.readdirSync(currentDir).filter(f => f.endsWith('.png'));

  for (const file of filesToCopy) {
    const src = path.join(currentDir, file);
    const dest = path.join(baselineDir, file);
    
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  return filesToCopy.length;
}

module.exports = {
  compareScreenshots,
  compareAllScreenshots,
  updateBaselines,
  isPixelmatchAvailable: () => !!(pixelmatch && PNG),
};
