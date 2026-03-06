import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';
import srb from './locales/srb.json';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
  srb: { translation: srb },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    /**
     * Fallback language configuration: EN → RU → SR
     * Primary fallback is English.
     * For Serbian (srb), additional fallback chain is handled at runtime.
     */
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'srb'],
    /**
     * Load only current language resources for better performance.
     * The fallbackLng will be used for missing keys.
     */
    load: 'currentOnly',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
    /**
     * React i18next options
     */
    react: {
      useSuspense: false,
    },
  });

/**
 * Fallback chain: EN → RU → SR
 * Priority order: English > Russian > Serbian
 */
export const FALLBACK_CHAIN = ['en', 'ru', 'srb'] as const;
export type FallbackLanguage = typeof FALLBACK_CHAIN[number];

/**
 * Get fallback language for a given language.
 * Uses the fallback chain: EN → RU → SR
 * 
 * @param language - The language to get fallback for
 * @returns The fallback language code
 */
export function getFallbackLanguage(language: string): string {
  // If already English, no fallback needed
  if (language === 'en') return 'en';
  
  // Russian falls back to English
  if (language === 'ru') return 'en';
  
  // Serbian falls back to Russian, then English
  if (language === 'srb') return 'ru';
  
  // Default fallback
  return 'en';
}

/**
 * Get the full fallback chain for a language.
 * Returns array of fallback languages in priority order.
 * 
 * @param language - The language to get chain for
 * @returns Array of fallback languages (e.g., ['ru', 'en'] for 'srb')
 */
export function getFallbackChain(language: string): string[] {
  const chain: string[] = [];
  
  let current = language;
  const visited = new Set<string>();
  
  while (current && !visited.has(current)) {
    visited.add(current);
    const fallback = getFallbackLanguage(current);
    if (fallback !== current && !visited.has(fallback)) {
      chain.push(fallback);
      current = fallback;
    } else {
      break;
    }
  }
  
  return chain;
}

/**
 * Get language priority for translation lookup.
 * Current language first, then fallbacks in order.
 * 
 * @param currentLanguage - The current active language
 * @returns Array of languages to try for translation
 */
export function getLanguagePriority(currentLanguage: string): string[] {
  return [currentLanguage, ...getFallbackChain(currentLanguage)];
}

export default i18n;
