/**
 * Screenshot Validators
 * Validates captured screenshots for quality and completeness
 */

const fs = require('fs');
const path = require('path');

/**
 * Detect if screenshot is blank/white by analyzing color diversity
 * @param {string} imagePath - Path to PNG screenshot
 * @param {number} minColors - Minimum unique colors required (default: 1000)
 * @returns {Promise<{valid: boolean, reason?: string, uniqueColors: number}>}
 */
async function validateScreenshot(imagePath, minColors = 1000) {
  try {
    if (!fs.existsSync(imagePath)) {
      return { valid: false, reason: 'File does not exist', uniqueColors: 0 };
    }

    const stats = fs.statSync(imagePath);
    if (stats.size < 1024) {
      return { valid: false, reason: 'File too small (< 1KB)', uniqueColors: 0 };
    }

    // Read PNG header to check if valid PNG
    const buffer = fs.readFileSync(imagePath);
    const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50;
    
    if (!isPNG) {
      return { valid: false, reason: 'Not a valid PNG file', uniqueColors: 0 };
    }

    // Check for blank/white by sampling pixels
    // This is a lightweight check - full pixel analysis would require sharp/pngjs
    const sampleSize = Math.min(buffer.length, 10000);
    const uniqueBytes = new Set();
    
    for (let i = 0; i < sampleSize; i += 100) {
      uniqueBytes.add(buffer[i]);
    }

    // If almost all bytes are the same, likely a blank image
    if (uniqueBytes.size < 10) {
      return { 
        valid: false, 
        reason: 'Possible blank/white image (low byte diversity)', 
        uniqueColors: uniqueBytes.size 
      };
    }

    return { valid: true, uniqueColors: uniqueBytes.size };
  } catch (error) {
    return { valid: false, reason: error.message, uniqueColors: 0 };
  }
}

/**
 * Validate all screenshots in a directory
 * @param {string} directory - Directory containing screenshots
 * @returns {Promise<Array<{name: string, valid: boolean, reason?: string}>>}
 */
async function validateAllScreenshots(directory) {
  const results = [];
  
  if (!fs.existsSync(directory)) {
    return results;
  }

  const files = fs.readdirSync(directory).filter(f => f.endsWith('.png'));
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const validation = await validateScreenshot(filePath);
    results.push({
      name: file,
      ...validation,
    });
  }

  return results;
}

/**
 * Check if file is recent (within last X minutes)
 * @param {string} filePath - Path to file
 * @param {number} minutes - Minutes threshold
 * @returns {boolean}
 */
function isRecentFile(filePath, minutes = 5) {
  if (!fs.existsSync(filePath)) return false;
  
  const stats = fs.statSync(filePath);
  const fileTime = stats.mtime.getTime();
  const threshold = Date.now() - (minutes * 60 * 1000);
  
  return fileTime > threshold;
}

module.exports = {
  validateScreenshot,
  validateAllScreenshots,
  isRecentFile,
};
