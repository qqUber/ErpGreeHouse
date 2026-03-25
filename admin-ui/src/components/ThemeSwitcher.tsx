import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeSwitcherProps {
  value?: ThemeMode;
  onChange?: (theme: ThemeMode) => void;
}

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState<ThemeMode>(value ?? getSystemTheme());

  useEffect(() => {
    if (value) {
      setTheme(value);
    }
  }, [value]);

  const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';

  const handleToggle = () => {
    setTheme(nextTheme);
    onChange?.(nextTheme);
  };

  return (
    <button
      type="button"
      className="theme-switcher-button"
      onClick={handleToggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={theme === 'dark'}
    >
      <span className="theme-switcher-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
      <span className="theme-switcher-icon" aria-hidden="true">
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}

export default ThemeSwitcher;
