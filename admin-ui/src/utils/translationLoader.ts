/**
 * Centralized Translation Loader
 *
 * Provides utilities for loading, caching, and managing translations
 * from the centralized locale directory.
 */
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import srb from '../locales/srb.json';
import { Language } from '../types/language';

/**
 * Translation resources indexed by language code
 */
export const TRANSLATION_RESOURCES: Record<Language, Record<string, unknown>> = {
  [Language.RU]: ru,
  [Language.EN]: en,
  [Language.SR]: srb,
};

/**
 * Available languages in the application
 */
export const AVAILABLE_LANGUAGES: Language[] = [Language.EN, Language.RU, Language.SR];

/**
 * Language display names
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  [Language.EN]: 'English',
  [Language.RU]: 'Русский',
  [Language.SR]: 'Српски',
};

/**
 * Get all translation keys from a nested translation object
 * @param obj - Translation object
 * @param prefix - Key prefix for nested keys
 * @returns Array of full translation keys
 */
export function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Get namespace from a translation key
 * @param key - Translation key (e.g., 'auth.login')
 * @returns Namespace (e.g., 'auth')
 */
export function getNamespace(key: string): string {
  return key.split('.')[0];
}

/**
 * Translation loader class for centralized translation management
 */
export class TranslationLoader {
  private cache: Map<Language, Record<string, unknown>> = new Map();
  private initialized = false;

  /**
   * Initialize the translation loader
   */
  initialize(): void {
    if (this.initialized) return;

    // Pre-load all translations into cache
    for (const lang of AVAILABLE_LANGUAGES) {
      this.cache.set(lang, TRANSLATION_RESOURCES[lang]);
    }

    this.initialized = true;
  }

  /**
   * Get translation for a specific language and key
   * @param language - Language code
   * @param key - Translation key (e.g., 'auth.login')
   * @param options - Interpolation options
   * @returns Translated string or key if not found
   */
  getTranslation(language: Language, key: string, options?: Record<string, unknown>): string {
    const translations = this.cache.get(language);
    if (!translations) {
      console.warn(`Language ${language} not found in cache`);
      return key;
    }

    // Navigate to the nested key
    const keys = key.split('.');
    let value: unknown = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(`Translation key ${key} not found for language ${language}`);
        return key;
      }
    }

    // Handle interpolation
    if (typeof value === 'string' && options) {
      return this.interpolate(value, options);
    }

    return typeof value === 'string' ? value : key;
  }

  /**
   * Simple string interpolation
   * @param template - Template string with {{variable}} placeholders
   * @param values - Values to interpolate
   * @returns Interpolated string
   */
  private interpolate(template: string, values: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return values[key] !== undefined ? String(values[key]) : `{{${key}}}`;
    });
  }

  /**
   * Get all keys for a specific language
   * @param language - Language code
   * @returns Array of all translation keys
   */
  getKeys(language: Language): string[] {
    const translations = this.cache.get(language);
    if (!translations) return [];

    return getAllKeys(translations);
  }

  /**
   * Get all namespaces
   * @returns Array of namespace strings
   */
  getNamespaces(): string[] {
    const enKeys = this.getKeys(Language.EN);
    const namespaces = new Set(enKeys.map(getNamespace));
    return Array.from(namespaces).sort();
  }

  /**
   * Check if a translation key exists
   * @param language - Language code
   * @param key - Translation key
   * @returns True if key exists
   */
  hasKey(language: Language, key: string): boolean {
    const translations = this.cache.get(language);
    if (!translations) return false;

    const keys = key.split('.');
    let value: unknown = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return false;
      }
    }

    return typeof value === 'string';
  }

  /**
   * Get translation statistics for a language
   * @param language - Language code
   * @returns Statistics object
   */
  getStats(language: Language): {
    totalKeys: number;
    namespaces: string[];
    namespaceCount: number;
  } {
    const keys = this.getKeys(language);
    const namespaces = new Set(keys.map(getNamespace));

    return {
      totalKeys: keys.length,
      namespaces: Array.from(namespaces).sort(),
      namespaceCount: namespaces.size,
    };
  }
}

// Singleton instance
export const translationLoader = new TranslationLoader();
