export interface Theme {
  colors: {
    // Primary palette
    bg: string;
    panel: string;
    border: string;
    text: string;
    muted: string;
    brand: string;
    primary: string;
    good: string;
    warn: string;
    bad: string;
    // Light variants for backgrounds
    primaryLight: string;
    goodLight: string;
    warnLight: string;
    badLight: string;
    brandLight: string;
    // Dark variants for hover/states
    primaryDark: string;
    goodDark: string;
    warnDark: string;
    badDark: string;
    brandDark: string;
    // Neutral colors
    neutral50: string;
    neutral100: string;
    neutral200: string;
    neutral300: string;
    neutral400: string;
    neutral500: string;
    neutral600: string;
    neutral700: string;
    neutral800: string;
    neutral900: string;
    // Semantic colors
    success: string;
    warning: string;
    error: string;
    info: string;
    // Semantic light variants
    successLight: string;
    warningLight: string;
    errorLight: string;
    infoLight: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  border: {
    radius: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
      full: string;
    };
    width: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  typography: {
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5: string;
    h6: string;
    body: string;
    caption: string;
    small: string;
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
      extrabold: number;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
    letterSpacing: {
      tight: string;
      normal: string;
      wide: string;
    };
  };
  // Micro-interaction durations
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
}

export const theme: Theme = {
  colors: {
    // Primary palette
    bg: '#f8fafc',
    panel: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    muted: '#64748b',
    brand: '#334155',
    primary: '#2563eb',
    good: '#059669',
    warn: '#d97706',
    bad: '#dc2626',
    // Light variants for backgrounds
    primaryLight: 'rgba(37, 99, 235, 0.08)',
    goodLight: 'rgba(5, 150, 105, 0.08)',
    warnLight: 'rgba(217, 119, 6, 0.08)',
    badLight: 'rgba(220, 38, 38, 0.08)',
    brandLight: 'rgba(51, 65, 85, 0.08)',
    // Dark variants for hover/states
    primaryDark: '#1d4ed8',
    goodDark: '#047857',
    warnDark: '#b45309',
    badDark: '#b91c1c',
    brandDark: '#1e293b',
    // Neutral colors
    neutral50: '#f8fafc',
    neutral100: '#f1f5f9',
    neutral200: '#e2e8f0',
    neutral300: '#cbd5e1',
    neutral400: '#94a3b8',
    neutral500: '#64748b',
    neutral600: '#475569',
    neutral700: '#334155',
    neutral800: '#1e293b',
    neutral900: '#0f172a',
    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    // Semantic light variants
    successLight: 'rgba(16, 185, 129, 0.1)',
    warningLight: 'rgba(245, 158, 11, 0.1)',
    errorLight: 'rgba(239, 68, 68, 0.1)',
    infoLight: 'rgba(59, 130, 246, 0.1)',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  breakpoints: {
    sm: '320px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    '3xl': '1920px', // Full HD monitor
  },
  border: {
    radius: {
      sm: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.25rem',
      full: '9999px',
    },
    width: '1px',
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  typography: {
    fontSize: {
      xs: '0.75rem',     // 12px - caption
      sm: '0.875rem',    // 14px - small
      base: '1rem',      // 16px - body
      lg: '1.125rem',    // 18px - large body
      xl: '1.25rem',     // 20px - h4
      '2xl': '1.5rem',   // 24px - h3
      '3xl': '1.875rem', // 30px - h2
      '4xl': '2.25rem',  // 36px - h1
    },
    // Heading font sizes (for reference)
    h1: '2.25rem',    // 36px
    h2: '1.875rem',   // 30px
    h3: '1.5rem',     // 24px
    h4: '1.25rem',    // 20px
    h5: '1.125rem',   // 18px
    h6: '1rem',       // 16px
    body: '1rem',      // 16px
    caption: '0.75rem', // 12px
    small: '0.875rem', // 14px
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  },
  transitions: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
};

export type Breakpoint = keyof Theme['breakpoints'];

export const mediaQueries = {
  sm: `(min-width: ${theme.breakpoints.sm})`,
  md: `(min-width: ${theme.breakpoints.md})`,
  lg: `(min-width: ${theme.breakpoints.lg})`,
  xl: `(min-width: ${theme.breakpoints.xl})`,
  '2xl': `(min-width: ${theme.breakpoints['2xl']})`,
  '3xl': `(min-width: ${theme.breakpoints['3xl']})`, // Full HD monitor
  maxSm: `(max-width: 767px)`,
  maxMd: `(max-width: 1023px)`,
  maxLg: `(max-width: 1279px)`,
  maxXl: `(max-width: 1535px)`,
  max2xl: `(max-width: 1919px)`,
};
