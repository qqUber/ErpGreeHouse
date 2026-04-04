// Centralized constants for hardcoded values across the application

// API Configuration
export const API_TIMEOUT = 30000;
export const VK_API_VERSION = '5.131';

// Pagination & Limits
export const DEFAULT_PAGE_SIZE = 20;
export const PREVIEW_LIMIT = 10;
export const MAX_PREVIEW_CUSTOMERS = 10;

// Timeouts (ms)
export const TOAST_DURATION_SHORT = 3000;
export const TOAST_DURATION_LONG = 5000;
export const WEBAPP_EXPAND_TIMEOUT = 600;
export const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

// UI Thresholds
export const MOBILE_HEIGHT_THRESHOLD = 900;

// Default Values
export const DEFAULT_TRIGGER_DELAY_HOURS = 24;
export const DEFAULT_DATE_LOCALE = 'ru-RU';
export const DEFAULT_CURRENCY = 'RUB';

// Placeholder Defaults
export const DEFAULT_AGE_MIN = 18;
export const DEFAULT_AGE_MAX = 65;
export const DEFAULT_DAYS_SINCE_VISIT = 30;
export const DEFAULT_MIN_PURCHASE_AMOUNT = 5000;
export const DEFAULT_PURCHASE_FREQUENCY = 5;
export const DEFAULT_BUDGET_EXAMPLE = 250;

// Telegram Menu Labels (for i18n keys reference)
export const TELEGRAM_MENU_LABELS = {
  BALANCE_CARD: 'integrations.telegram.menu.balanceCard',
  MENU_ADDRESSES: 'integrations.telegram.menu.menuAddresses',
  OPEN_CAFE: 'integrations.telegram.menu.openCafe',
  ASK_QUESTION: 'integrations.telegram.menu.askQuestion',
  LEAVE_REVIEW: 'integrations.telegram.menu.leaveReview',
  VACANCIES: 'integrations.telegram.menu.vacancies',
  ABOUT_CLUB: 'integrations.telegram.menu.aboutClub',
} as const;
