export interface Theme {
  colors: {
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
    // Additional color variants for consistency
    primaryLight: string;
    goodLight: string;
    warnLight: string;
    badLight: string;
    brandLight: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
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
  };
  typography: {
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
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
  };
}

export const theme: Theme = {
  colors: {
    bg: '#f6f7fb',
    panel: '#ffffff',
    border: '#e6e8ef',
    text: '#111827',
    muted: '#585e6b', /* Improved contrast */
    brand: '#2d3748', /* Darker brand color for better contrast */
    primary: '#2563eb', /* Darker blue for better contrast */
    good: '#059669', /* Darker green for better contrast */
    warn: '#d97706', /* Darker orange for better contrast */
    bad: '#dc2626', /* Darker red for better contrast */
    // Light variants for backgrounds
    primaryLight: 'rgba(59, 130, 246, 0.06)',
    goodLight: 'rgba(4, 120, 87, 0.06)',
    warnLight: 'rgba(180, 83, 9, 0.06)',
    badLight: 'rgba(185, 28, 28, 0.06)',
    brandLight: 'rgba(55, 65, 81, 0.06)',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  breakpoints: {
    sm: '320px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
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
  },
  typography: {
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
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
  },
};

export type Breakpoint = keyof Theme['breakpoints'];

export const mediaQueries = {
  sm: `(min-width: ${theme.breakpoints.sm})`,
  md: `(min-width: ${theme.breakpoints.md})`,
  lg: `(min-width: ${theme.breakpoints.lg})`,
  xl: `(min-width: ${theme.breakpoints.xl})`,
  '2xl': `(min-width: ${theme.breakpoints['2xl']})`,
  maxSm: `(max-width: 767px)`,
  maxMd: `(max-width: 1023px)`,
  maxLg: `(max-width: 1279px)`,
};
