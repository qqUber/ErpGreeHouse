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
}

export const theme: Theme = {
  colors: {
    bg: '#f6f7fb',
    panel: '#ffffff',
    border: '#e6e8ef',
    text: '#111827',
    muted: '#6b7280',
    brand: '#374151',
    primary: '#3b82f6',
    good: '#047857',
    warn: '#b45309',
    bad: '#b91c1c',
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
