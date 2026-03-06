/**
 * Translation helper utilities for common formatting patterns.
 * Provides type-safe wrappers for currency, date, and number formatting with i18n support.
 */
import i18n from '../i18n';

/**
 * Format a number as currency using the current language.
 * 
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'RUB')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'RUB'): string {
  const language = i18n.language || 'en';
  
  try {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Format a number with thousand separators.
 * 
 * @param value - The number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  const language = i18n.language || 'en';
  
  return new Intl.NumberFormat(language).format(value);
}

/**
 * Format a number as percentage.
 * 
 * @param value - The decimal value (e.g., 0.25 for 25%)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 0): string {
  const language = i18n.language || 'en';
  
  return new Intl.NumberFormat(language, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a date using the current language.
 * 
 * @param date - Date to format (Date, string, or number)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const language = i18n.language || 'en';
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  return new Intl.DateTimeFormat(language, options || defaultOptions).format(dateObj);
}

/**
 * Format a date as short format (e.g., "Jan 15, 2024").
 * 
 * @param date - Date to format
 * @returns Short formatted date string
 */
export function formatDateShort(date: Date | string | number): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date as relative (e.g., "today", "yesterday", "2 days ago").
 * 
 * @param date - Date to format
 * @returns Relative date string
 */
export function formatRelativeDate(date: Date | string | number): string {
  const language = i18n.language || 'en';
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  
  const diffTime = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return i18n.t('date.today');
  }
  
  if (diffDays === 1) {
    return i18n.t('date.yesterday');
  }
  
  if (diffDays > 1 && diffDays < 7) {
    return `${diffDays} ${i18n.t('date.thisWeek')}`;
  }
  
  if (diffDays >= 7 && diffDays < 30) {
    return formatDateShort(date);
  }
  
  return formatDate(date);
}

/**
 * Format time using the current language.
 * 
 * @param date - Date to format
 * @param includeDate - Whether to include the date
 * @returns Formatted time string
 */
export function formatTime(date: Date | string | number, includeDate = false): string {
  const language = i18n.language || 'en';
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  
  if (includeDate) {
    options.year = 'numeric';
    options.month = 'short';
    options.day = 'numeric';
  }
  
  return new Intl.DateTimeFormat(language, options).format(dateObj);
}

/**
 * Format a phone number.
 * 
 * @param phone - Phone number string
 * @returns Formatted phone number
 */
export function formatPhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 10) {
    // Russian format: +7 (XXX) XXX-XX-XX
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  }
  
  if (digits.length === 11 && digits[0] === '7') {
    // Russian format with 7: +7 (XXX) XXX-XX-XX
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  
  // Return original if can't format
  return phone;
}

/**
 * Format file size.
 * 
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Truncate text and add ellipsis.
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Pluralize a word based on count.
 * 
 * @param count - Count to determine plural form
 * @param forms - Array of 3 forms: [one, few, many]
 * @returns Correct plural form
 */
export function pluralize(count: number, forms: [string, string, string]): string {
  const language = i18n.language || 'en';
  
  // Russian pluralization rules
  if (language === 'ru' || language === 'srb') {
    const mod10 = count % 10;
    const mod100 = count % 100;
    
    if (mod10 === 1 && mod100 !== 11) {
      return forms[0]; // one
    }
    
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return forms[1]; // few
    }
    
    return forms[2]; // many
  }
  
  // English pluralization
  return count === 1 ? forms[0] : forms[2];
}

/**
 * Get ordinal suffix for a number.
 * 
 * @param n - Number
 * @returns Ordinal suffix (e.g., "st", "nd", "rd", "th")
 */
export function getOrdinalSuffix(n: number): string {
  const language = i18n.language || 'en';
  
  if (language === 'en') {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }
  
  return '';
}
