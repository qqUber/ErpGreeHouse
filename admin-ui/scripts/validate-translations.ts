/**
 * Translation Completeness Validator
 * 
 * Validates that all languages have the same translation keys
 * and reports any missing or inconsistent translations.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Language files to validate
const LANGUAGES = ['en', 'ru', 'srb'] as const;
type LanguageCode = typeof LANGUAGES[number];

interface ValidationResult {
  isValid: boolean;
  missingKeys: Map<LanguageCode, string[]>;
  extraKeys: Map<LanguageCode, string[]>;
  totalKeys: Record<LanguageCode, number>;
  namespaces: Record<LanguageCode, string[]>;
  errors: string[];
}

/**
 * Flatten nested object into dot-notation keys
 */
function flattenObject(obj: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  
  if (typeof obj !== 'object' || obj === null) {
    return result;
  }
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }
  
  return result;
}

/**
 * Get namespace from a key
 */
function getNamespace(key: string): string {
  return key.split('.')[0];
}

/**
 * Load and parse a language file
 */
function loadLanguageFile(langCode: LanguageCode): Record<string, string> {
  const filePath = path.join(__dirname, '..', 'src', 'locales', `${langCode}.json`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Language file not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  
  return flattenObject(parsed);
}

/**
 * Validate translation completeness across all languages
 */
function validateTranslations(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    missingKeys: new Map(),
    extraKeys: new Map(),
    totalKeys: {} as Record<LanguageCode, number>,
    namespaces: {} as Record<LanguageCode, string[]>,
    errors: [],
  };
  
  // Load all language files
  const translations: Record<LanguageCode, Record<string, string>> = {} as Record<LanguageCode, Record<string, string>>;
  
  for (const lang of LANGUAGES) {
    try {
      translations[lang] = loadLanguageFile(lang);
      result.totalKeys[lang] = Object.keys(translations[lang]).length;
      
      // Get unique namespaces
      const nsSet = new Set(Object.keys(translations[lang]).map(getNamespace));
      result.namespaces[lang] = Array.from(nsSet).sort();
    } catch (error) {
      result.errors.push(`Failed to load ${lang}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }
  }
  
  if (result.errors.length > 0) {
    return result;
  }
  
  // Get reference keys (English as reference)
  const referenceKeys = new Set(Object.keys(translations.en));
  
  // Check for missing keys in each language
  for (const lang of LANGUAGES) {
    const langKeys = new Set(Object.keys(translations[lang]));
    const missing: string[] = [];
    const extra: string[] = [];
    
    // Find missing keys
    for (const key of referenceKeys) {
      if (!langKeys.has(key)) {
        missing.push(key);
      }
    }
    
    // Find extra keys
    for (const key of langKeys) {
      if (!referenceKeys.has(key)) {
        extra.push(key);
      }
    }
    
    if (missing.length > 0) {
      result.isValid = false;
    }
    
    result.missingKeys.set(lang, missing);
    result.extraKeys.set(lang, extra);
  }
  
  return result;
}

/**
 * Print validation results to console
 */
function printResults(result: ValidationResult): boolean {
  console.log('\n========================================');
  console.log('  TRANSLATION VALIDATION REPORT');
  console.log('========================================\n');
  
  // Print total keys per language
  console.log('Total Translation Keys:');
  for (const lang of LANGUAGES) {
    console.log(`  ${lang.toUpperCase()}: ${result.totalKeys[lang]} keys`);
  }
  console.log('');
  
  // Print namespaces
  console.log('Namespaces:');
  for (const lang of LANGUAGES) {
    console.log(`  ${lang.toUpperCase()}: ${result.namespaces[lang]?.join(', ') || 'N/A'}`);
  }
  console.log('');
  
  // Print missing keys
  let hasMissing = false;
  for (const lang of LANGUAGES) {
    const missing = result.missingKeys.get(lang);
    if (missing && missing.length > 0) {
      hasMissing = true;
      break;
    }
  }
  
  if (hasMissing) {
    console.log('MISSING TRANSLATIONS:');
    for (const lang of LANGUAGES) {
      const missing = result.missingKeys.get(lang);
      if (missing && missing.length > 0) {
        console.log(`\n  ${lang.toUpperCase()} (${missing.length} missing):`);
        
        // Group by namespace
        const byNamespace: Record<string, string[]> = {};
        for (const key of missing) {
          const ns = getNamespace(key);
          if (!byNamespace[ns]) byNamespace[ns] = [];
          byNamespace[ns].push(key);
        }
        
        for (const [ns, keys] of Object.entries(byNamespace)) {
          console.log(`    [${ns}] ${keys.length} keys`);
        }
      }
    }
    console.log('');
  }
  
  // Print extra keys
  let hasExtra = false;
  for (const lang of LANGUAGES) {
    const extra = result.extraKeys.get(lang);
    if (extra && extra.length > 0) {
      hasExtra = true;
      break;
    }
  }
  
  if (hasExtra) {
    console.log('EXTRA TRANSLATIONS (not in English):');
    for (const lang of LANGUAGES) {
      const extra = result.extraKeys.get(lang);
      if (extra && extra.length > 0) {
        console.log(`  ${lang.toUpperCase()}: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? '...' : ''} (${extra.length} total)`);
      }
    }
    console.log('');
  }
  
  // Print errors
  if (result.errors.length > 0) {
    console.log('ERRORS:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    console.log('');
  }
  
  // Final status
  console.log('----------------------------------------');
  if (result.isValid) {
    console.log('  STATUS: ✓ VALID');
  } else {
    console.log('  STATUS: ✗ INVALID');
  }
  console.log('----------------------------------------\n');
  
  return result.isValid;
}

/**
 * Main execution
 */
function main(): void {
  console.log('Starting translation validation...\n');
  
  const result = validateTranslations();
  const isValid = printResults(result);
  
  // Exit with error code if validation failed
  if (!isValid) {
    process.exit(1);
  }
}

main();
