import { render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { LoadingSpinner } from '../LoadingSpinner';
import '../LoadingSpinner.css';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
  debug: false,
});

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

describe('LoadingSpinner', () => {
  it('renders spinner with correct data-testid', () => {
    render(<LoadingSpinner />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders small spinner', () => {
    render(<LoadingSpinner size="sm" />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('spinner-sm');
  });

  it('renders medium spinner by default', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('spinner-md');
  });

  it('renders large spinner', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('spinner-lg');
  });

  it('renders optional message text', () => {
    render(<LoadingSpinner message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders without message when not provided', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('has aria-busy="true" for accessibility', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveAttribute('aria-busy', 'true');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
    expect(spinner).toHaveAttribute('role', 'status');
  });

  it('renders full-screen overlay when fullScreen is true', () => {
    render(<LoadingSpinner fullScreen />);
    expect(screen.getByTestId('loading-spinner-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    const container = screen.getByTestId('loading-spinner').parentElement;
    expect(container).toHaveClass('custom-class');
  });
});
