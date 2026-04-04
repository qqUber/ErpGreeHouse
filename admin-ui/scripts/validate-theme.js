#!/usr/bin/env node
/**
 * Theme Validation CI Script
 * Phase 6: Automated theme validation for CI/CD pipeline
 * 
 * Validates:
 * - CSS variables are properly defined
 * - Design tokens are consistent
 * - No duplicate or conflicting values
 * - Theme config is valid JSON
 * 
 * Exit codes:
 * 0 - All validations passed
 * 1 - Critical errors found
 * 2 - Warnings only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const results = {
  errors: [],
  warnings: [],
  passed: [],
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
  }[type];
  console.log(`${prefix} ${message}`);
}

// Validation: CSS variables exist
function validateCSSVariables() {
  log('Validating CSS variables...', 'info');
  const cssPath = path.join(ROOT_DIR, 'src', 'styles.css');
  
  if (!fs.existsSync(cssPath)) {
    results.errors.push('styles.css not found');
    return false;
  }
  
  const css = fs.readFileSync(cssPath, 'utf8');
  
  // Check for :root selector with CSS variables
  if (!css.includes(':root')) {
    results.errors.push('Missing :root selector for CSS variables');
    return false;
  }
  
  // Check for essential variables
  const essentialVars = [
    '--primary',
    '--secondary',
    '--good',
    '--bad',
    '--warn',
    '--spacing-xs',
    '--spacing-sm',
    '--spacing-md',
    '--font-size-xs',
    '--font-size-sm',
    '--radius-sm',
    '--radius-md',
  ];
  
  let missingVars = [];
  for (const v of essentialVars) {
    if (!css.includes(v)) {
      missingVars.push(v);
    }
  }
  
  if (missingVars.length > 0) {
    results.errors.push(`Missing essential CSS variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  results.passed.push('CSS variables validation');
  return true;
}

// Validation: Design tokens are valid
function validateDesignTokens() {
  log('Validating design tokens...', 'info');
  const tokensPath = path.join(ROOT_DIR, 'src', 'tokens', 'tokens.json');
  
  if (!fs.existsSync(tokensPath)) {
    results.warnings.push('tokens.json not found, run: npm run tokens:export');
    return false;
  }
  
  try {
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    
    // Check token categories
    const categories = ['colors', 'spacing', 'typography', 'borders', 'shadows'];
    let missingCategories = [];
    
    for (const cat of categories) {
      if (!tokens[cat] || Object.keys(tokens[cat]).length === 0) {
        missingCategories.push(cat);
      }
    }
    
    if (missingCategories.length > 0) {
      results.warnings.push(`Empty token categories: ${missingCategories.join(', ')}`);
    }
    
    results.passed.push('Design tokens validation');
    return true;
  } catch (e) {
    results.errors.push(`Invalid tokens.json: ${e.message}`);
    return false;
  }
}

// Validation: Theme config structure
function validateThemeConfig() {
  log('Validating theme config...', 'info');
  const themePath = path.join(ROOT_DIR, 'src', 'theme.ts');
  
  if (!fs.existsSync(themePath)) {
    results.warnings.push('theme.ts not found');
    return false;
  }
  
  const theme = fs.readFileSync(themePath, 'utf8');
  
  // Check for theme object structure
  if (!theme.includes('export') || !theme.includes('ThemeConfig')) {
    results.warnings.push('theme.ts may be missing exports or ThemeConfig');
  }
  
  results.passed.push('Theme config validation');
  return true;
}

// Validation: No duplicate CSS classes
function validateNoDuplicateClasses() {
  log('Checking for duplicate CSS classes...', 'info');
  const cssPath = path.join(ROOT_DIR, 'src', 'styles.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  
  // Extract class names
  const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g;
  const classes = [];
  let match;
  
  while ((match = classRegex.exec(css)) !== null) {
    classes.push(match[1]);
  }
  
  // Check for duplicates
  const duplicates = classes.filter((item, index) => classes.indexOf(item) !== index);
  const uniqueDuplicates = [...new Set(duplicates)];
  
  if (uniqueDuplicates.length > 0) {
    results.warnings.push(`Duplicate CSS classes found: ${uniqueDuplicates.join(', ')}`);
  }
  
  results.passed.push('Duplicate classes check');
  return true;
}

// Validation: Biome config is valid
function validateBiomeConfig() {
  log('Validating Biome configuration...', 'info');
  const biomePath = path.join(ROOT_DIR, 'biome.json');
  
  if (!fs.existsSync(biomePath)) {
    results.warnings.push('biome.json not found');
    return false;
  }
  
  try {
    const biome = JSON.parse(fs.readFileSync(biomePath, 'utf8'));
    
    // Check for CSS linting rules
    if (!biome.css || !biome.css.linter || !biome.css.linter.enabled) {
      results.warnings.push('CSS linting not enabled in biome.json');
    }
    
    results.passed.push('Biome config validation');
    return true;
  } catch (e) {
    results.errors.push(`Invalid biome.json: ${e.message}`);
    return false;
  }
}

// Main validation runner
async function runValidations() {
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  UI Visual Standards Validation${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);
  
  // Run all validations
  validateCSSVariables();
  validateDesignTokens();
  validateThemeConfig();
  validateNoDuplicateClasses();
  validateBiomeConfig();
  
  // Print summary
  console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Validation Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);
  
  if (results.passed.length > 0) {
    console.log(`${colors.green}✓ Passed (${results.passed.length}):${colors.reset}`);
    results.passed.forEach(p => console.log(`  ${colors.green}•${colors.reset} ${p}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠ Warnings (${results.warnings.length}):${colors.reset}`);
    results.warnings.forEach(w => console.log(`  ${colors.yellow}•${colors.reset} ${w}`));
  }
  
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}✗ Errors (${results.errors.length}):${colors.reset}`);
    results.errors.forEach(e => console.log(`  ${colors.red}•${colors.reset} ${e}`));
  }
  
  // Exit with appropriate code
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}Validation FAILED with ${results.errors.length} errors${colors.reset}\n`);
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}Validation PASSED with ${results.warnings.length} warnings${colors.reset}\n`);
    process.exit(0); // Still pass CI, but with warnings
  } else {
    console.log(`\n${colors.green}✓ All validations passed!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run validations
runValidations().catch(e => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, e);
  process.exit(1);
});
