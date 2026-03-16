import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { ErrorMessage } from '../ErrorMessage';
import '../ErrorMessage.css';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
  debug: false,
});

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

describe('ErrorMessage', () => {
  it('renders error message text', () => {
    render(<ErrorMessage message="Test error message" />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('has correct data-testid', () => {
    render(<ErrorMessage message="Test error" />);
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('has role="alert" for accessibility', () => {
    render(<ErrorMessage message="Test error" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorMessage message="Test error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByTestId('error-message-dismiss');
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders without dismiss button when onDismiss not provided', () => {
    render(<ErrorMessage message="Test error" />);
    expect(screen.queryByTestId('error-message-dismiss')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ErrorMessage message="Test error" className="custom-class" />);
    const element = screen.getByTestId('error-message');
    expect(element).toHaveClass('custom-class');
    expect(element).toHaveClass('error-message');
  });
});
