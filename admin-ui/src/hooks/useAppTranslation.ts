/**
 * Type-safe translation hook for the application.
 * Provides typed access to i18next translation function.
 */
import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { TranslationKey } from '../types/translationKeys';

/**
 * Custom hook that provides a type-safe translation function.
 *
 * @returns Object containing:
 * - t: Type-safe translation function
 * - i18n: i18next instance for language control
 * - ready: Whether translations are loaded
 * - language: Current language code
 */
export function useAppTranslation() {
  const { t, i18n, ready } = useI18nextTranslation();

  /**
   * Type-safe translation function.
   * Accepts translation keys defined in translationKeys.ts
   */
  const translate = (key: TranslationKey | string, options?: Record<string, unknown>): string => {
    return t(key, options) as string;
  };

  return {
    t: translate,
    i18n,
    ready,
    language: i18n.language,
    /**
     * Change the application language
     */
    changeLanguage: async (lng: string) => {
      await i18n.changeLanguage(lng);
    },
    /**
     * Get current language or specific translation
     */
    getLanguage: () => i18n.language,
  };
}

export default useAppTranslation;
