/**
 * Language enum for supported application languages.
 * Maps to i18next language codes used in locale files.
 */
export enum Language {
  RU = 'ru',
  EN = 'en',
  SR = 'srb',
}

/**
 * Human-readable labels for languages
 */
export const LanguageLabel: Record<Language, string> = {
  [Language.RU]: 'Русский',
  [Language.EN]: 'English',
  [Language.SR]: 'Србски',
};

/**
 * Get language from code string
 */
export function parseLanguage(code: string | undefined | null): Language | null {
  if (!code) return null;
  const normalized = code.toLowerCase();
  if (normalized === 'ru') return Language.RU;
  if (normalized === 'en') return Language.EN;
  if (normalized === 'srb') return Language.SR;
  return null;
}

/**
 * Supported language codes for i18next
 */
export const SUPPORTED_LANGUAGES = ['en', 'ru', 'srb'] as const;

/**
 * Get native language name from code
 */
export function getLanguageNativeName(code: Language): string {
  const names: Record<Language, string> = {
    [Language.RU]: 'Русский',
    [Language.EN]: 'English',
    [Language.SR]: 'Србски',
  };
  return names[code];
}
