#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== ErpGreeHouse Responsive Design Analysis ===\n');

// Check for common responsive design issues in the codebase
const srcDir = path.join(__dirname, 'src');

// 1. Check for viewport meta tag
console.log('1. Viewport Meta Tag');
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const hasViewport = indexHtml.includes('viewport');
const viewportContent = indexHtml.match(/<meta[^>]*viewport[^>]*>/);

if (hasViewport) {
    console.log('✓ Viewport meta tag found');
    if (viewportContent) {
        const content = viewportContent[0];
        const hasUserScalable = content.includes('user-scalable');
        const hasMaximumScale = content.includes('maximum-scale');
        
        if (!hasUserScalable || !content.includes('user-scalable=no')) {
            console.log('✓ Viewport allows user scaling');
        } else {
            console.log('⚠ Viewport disables user scaling');
        }
        
        if (!hasMaximumScale || content.includes('maximum-scale=5')) {
            console.log('✓ Maximum scale is appropriate');
        } else {
            console.log('⚠ Maximum scale is too restrictive');
        }
    }
} else {
    console.log('✗ Viewport meta tag missing');
}

console.log();

// 2. Check grid and responsive classes usage
console.log('2. Grid and Responsive Classes');
const tsxFiles = [];

function findTsxFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            findTsxFiles(filePath);
        } else if (file.endsWith('.tsx')) {
            tsxFiles.push(filePath);
        }
    });
}

findTsxFiles(srcDir);

let gridCount = 0;
let responsiveGridCount = 0;
let fixedWidthCount = 0;

tsxFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Count grid usage
    const gridMatches = content.match(/grid-cols-(\d+)/g);
    if (gridMatches) {
        gridCount += gridMatches.length;
    }
    
    // Count responsive grid usage
    const responsiveGridMatches = content.match(/(md|lg|sm|xl|2xl):grid-cols-(\d+)/g);
    if (responsiveGridMatches) {
        responsiveGridCount += responsiveGridMatches.length;
    }
    
    // Count fixed width elements
    const fixedWidthMatches = content.match(/width:\s*(\d+)(px|rem|em)/g);
    if (fixedWidthMatches) {
        fixedWidthCount += fixedWidthMatches.length;
    }
});

console.log(`✓ Total grid layouts: ${gridCount}`);
console.log(`✓ Responsive grid classes: ${responsiveGridCount}`);
console.log(`⚠ Fixed width elements: ${fixedWidthCount}`);

console.log();

// 3. Check for CSS media queries
console.log('3. CSS Media Queries');
const cssFiles = [];

function findCssFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            findCssFiles(filePath);
        } else if (file.endsWith('.css')) {
            cssFiles.push(filePath);
        }
    });
}

findCssFiles(srcDir);

let mediaQueries = [];

cssFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const mqMatches = content.match(/@media\s*\([^)]+\)/g);
    if (mqMatches) {
        mqMatches.forEach(mq => {
            mediaQueries.push({ file, query: mq });
        });
    }
});

if (mediaQueries.length > 0) {
    console.log(`✓ Media queries found: ${mediaQueries.length}`);
    
    const breakpoints = new Map();
    mediaQueries.forEach(mq => {
        const mqStr = mq.query;
        const pxMatch = mqStr.match(/(\d+)px/);
        if (pxMatch) {
            const px = parseInt(pxMatch[1]);
            breakpoints.set(px, (breakpoints.get(px) || 0) + 1);
        }
    });
    
    console.log('  Breakpoints used:');
    Array.from(breakpoints.entries()).sort((a, b) => a[0] - b[0]).forEach(([px, count]) => {
        console.log(`    ${px}px: ${count} times`);
    });
} else {
    console.log('✗ No media queries found');
}

console.log();

// 4. Check for accessibility features
console.log('4. Accessibility Features');
let ariaCount = 0;
let roleCount = 0;
let altTextCount = 0;
let missingAltCount = 0;

tsxFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Count ARIA attributes
    const ariaMatches = content.match(/aria-[a-zA-Z-]+=/g);
    if (ariaMatches) {
        ariaCount += ariaMatches.length;
    }
    
    // Count role attributes
    const roleMatches = content.match(/role=/g);
    if (roleMatches) {
        roleCount += roleMatches.length;
    }
    
    // Count images with and without alt text
    const imgTags = content.match(/<img[^>]*>/g);
    if (imgTags) {
        imgTags.forEach(img => {
            if (img.includes('alt=')) {
                const altValue = img.match(/alt="([^"]*)"/);
                if (altValue && altValue[1].trim()) {
                    altTextCount++;
                } else {
                    missingAltCount++;
                }
            } else {
                missingAltCount++;
            }
        });
    }
});

console.log(`✓ ARIA attributes: ${ariaCount}`);
console.log(`✓ Role attributes: ${roleCount}`);
console.log(`✓ Images with alt text: ${altTextCount}`);
console.log(`⚠ Images without alt text: ${missingAltCount}`);

console.log();

// 5. Check for semantic HTML
console.log('5. Semantic HTML');
let headerCount = 0;
let navCount = 0;
let mainCount = 0;
let sectionCount = 0;
let articleCount = 0;
let asideCount = 0;
let footerCount = 0;

tsxFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    headerCount += (content.match(/<header[^>]*>/g) || []).length;
    navCount += (content.match(/<nav[^>]*>/g) || []).length;
    mainCount += (content.match(/<main[^>]*>/g) || []).length;
    sectionCount += (content.match(/<section[^>]*>/g) || []).length;
    articleCount += (content.match(/<article[^>]*>/g) || []).length;
    asideCount += (content.match(/<aside[^>]*>/g) || []).length;
    footerCount += (content.match(/<footer[^>]*>/g) || []).length;
});

console.log(`✓ Header tags: ${headerCount}`);
console.log(`✓ Nav tags: ${navCount}`);
console.log(`✓ Main tags: ${mainCount}`);
console.log(`✓ Section tags: ${sectionCount}`);
console.log(`✓ Article tags: ${articleCount}`);
console.log(`✓ Aside tags: ${asideCount}`);
console.log(`✓ Footer tags: ${footerCount}`);

console.log();

// 6. Summary
console.log('=== Summary ===');
console.log(`Total components analyzed: ${tsxFiles.length} TSX files`);

const responsiveScore = Math.round((responsiveGridCount / gridCount) * 100) || 0;
console.log(`Responsive grid usage: ${responsiveScore}%`);

const accessibilityScore = Math.round(((ariaCount + roleCount + altTextCount) / 
                                      (ariaCount + roleCount + altTextCount + missingAltCount + 1)) * 100) || 0;
console.log(`Accessibility features: ${accessibilityScore}%`);

const semanticScore = Math.round(((headerCount + navCount + mainCount + sectionCount + 
                                  articleCount + asideCount + footerCount) / 
                                 (tsxFiles.length * 3)) * 100) || 0;
console.log(`Semantic HTML: ${semanticScore}%`);

console.log();
console.log('=== Key Issues to Address ===');

if (!hasViewport) {
    console.log('1. Add viewport meta tag with appropriate settings');
}

if (responsiveScore < 70) {
    console.log('2. Increase use of responsive grid classes (md:, lg:, etc.)');
}

if (missingAltCount > 0) {
    console.log('3. Add alt text to images');
}

if (semanticScore < 60) {
    console.log('4. Use more semantic HTML elements');
}
