/**
 * Design Tokens Export Pipeline
 * 
 * This script extracts CSS variables from styles.css and exports them to:
 * 1. JSON file for documentation
 * 2. TypeScript constants for type safety
 * 
 * Run: node scripts/export-tokens.js
 */

import fs from 'fs';
import path from 'path';

const STYLES_PATH = path.join(process.cwd(), 'src', 'styles.css');
const OUTPUT_DIR = path.join(process.cwd(), 'src', 'tokens');

function extractCSSVariables(cssContent) {
  const variables = {
    colors: {},
    spacing: {},
    typography: {},
    breakpoints: {},
    borders: {},
    shadows: {},
    zIndex: {},
    transitions: {},
  };

  // Match CSS variables in :root
  const rootMatch = cssContent.match(/:root\s*{([^}]*)}/s);
  if (!rootMatch) return variables;

  const rootContent = rootMatch[1];

  // Extract all --variable: value; patterns
  const variableRegex = /--([\w-]+):\s*([^;]+);/g;
  let match;

  while ((match = variableRegex.exec(rootContent)) !== null) {
    const [, name, value] = match;
    const cleanValue = value.trim();

    // Categorize variables
    if (name.startsWith('color-') || name.includes('primary') || name.includes('secondary') || name.includes('good') || name.includes('bad') || name.includes('warn')) {
      variables.colors[name] = cleanValue;
    } else if (name.startsWith('spacing-') || name.startsWith('space-')) {
      variables.spacing[name] = cleanValue;
    } else if (name.startsWith('font-') || name.startsWith('text-') || name.includes('size')) {
      variables.typography[name] = cleanValue;
    } else if (name.startsWith('breakpoint-')) {
      variables.breakpoints[name] = cleanValue;
    } else if (name.startsWith('border-') || name.startsWith('radius-')) {
      variables.borders[name] = cleanValue;
    } else if (name.startsWith('shadow-')) {
      variables.shadows[name] = cleanValue;
    } else if (name.startsWith('z-')) {
      variables.zIndex[name] = cleanValue;
    } else if (name.startsWith('transition-')) {
      variables.transitions[name] = cleanValue;
    }
  }

  return variables;
}

function generateTypeScriptTokens(tokens) {
  const sections = [];

  // Colors
  const colorEntries = Object.entries(tokens.colors);
  if (colorEntries.length > 0) {
    sections.push(`// Colors`);
    sections.push(`export const colors = {`);
    colorEntries.forEach(([key, value]) => {
      sections.push(`  '${key}': '${value}',`);
    });
    sections.push(`} as const;`);
    sections.push(``);
    sections.push(`export type ColorToken = keyof typeof colors;`);
  }

  // Spacing
  const spacingEntries = Object.entries(tokens.spacing);
  if (spacingEntries.length > 0) {
    sections.push(`// Spacing`);
    sections.push(`export const spacing = {`);
    spacingEntries.forEach(([key, value]) => {
      sections.push(`  '${key}': '${value}',`);
    });
    sections.push(`} as const;`);
    sections.push(``);
    sections.push(`export type SpacingToken = keyof typeof spacing;`);
  }

  // Typography
  const typographyEntries = Object.entries(tokens.typography);
  if (typographyEntries.length > 0) {
    sections.push(`// Typography`);
    sections.push(`export const typography = {`);
    typographyEntries.forEach(([key, value]) => {
      sections.push(`  '${key}': '${value}',`);
    });
    sections.push(`} as const;`);
    sections.push(``);
    sections.push(`export type TypographyToken = keyof typeof typography;`);
  }

  // Breakpoints
  const breakpointEntries = Object.entries(tokens.breakpoints);
  if (breakpointEntries.length > 0) {
    sections.push(`// Breakpoints`);
    sections.push(`export const breakpoints = {`);
    breakpointEntries.forEach(([key, value]) => {
      sections.push(`  '${key}': '${value}',`);
    });
    sections.push(`} as const;`);
    sections.push(``);
    sections.push(`export type BreakpointToken = keyof typeof breakpoints;`);
  }

  // All tokens combined
  sections.push(`// All Design Tokens`);
  sections.push(`export const tokens = {`);
  sections.push(`  colors,`);
  sections.push(`  spacing,`);
  sections.push(`  typography,`);
  sections.push(`  breakpoints,`);
  sections.push(`  borders: ${JSON.stringify(tokens.borders, null, 2).replace(/"/g, "'")},`);
  sections.push(`  shadows: ${JSON.stringify(tokens.shadows, null, 2).replace(/"/g, "'")},`);
  sections.push(`} as const;`);
  sections.push(``);
  sections.push(`export type TokenPath =`);
  sections.push(`  | \`colors.\${ColorToken}\``);
  sections.push(`  | \`spacing.\${SpacingToken}\``);
  sections.push(`  | \`typography.\${TypographyToken}\``);
  sections.push(`  | \`breakpoints.\${BreakpointToken}\`;`);

  return `/**
 * Auto-generated Design Tokens
 * Generated from src/styles.css
 * Do not edit manually - run: node scripts/export-tokens.js
 */

${sections.join('\n')}
`;
}

function generateJSONTokens(tokens) {
  return JSON.stringify(tokens, null, 2);
}

// Main execution
console.log('🔧 Exporting design tokens...\n');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read and parse CSS
const cssContent = fs.readFileSync(STYLES_PATH, 'utf8');
const tokens = extractCSSVariables(cssContent);

// Generate outputs
const tsContent = generateTypeScriptTokens(tokens);
const jsonContent = generateJSONTokens(tokens);

// Write files
fs.writeFileSync(path.join(OUTPUT_DIR, 'tokens.ts'), tsContent);
fs.writeFileSync(path.join(OUTPUT_DIR, 'tokens.json'), jsonContent);

console.log('✅ Tokens exported successfully!');
console.log(`   📄 src/tokens/tokens.ts (${Object.values(tokens).flatMap(Object.keys).length} tokens)`);
console.log(`   📄 src/tokens/tokens.json`);
console.log('\nToken categories:');
Object.entries(tokens).forEach(([category, values]) => {
  const count = Object.keys(values).length;
  if (count > 0) {
    console.log(`   • ${category}: ${count} tokens`);
  }
});
