import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { SuccessMessage } from '../SuccessMessage';
import '../SuccessMessage.css';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
  debug: false,
});

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

describe('SuccessMessage', () => {
  it('renders success message text', () => {
    render(<SuccessMessage message="Operation successful" />);
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('has correct data-testid', () => {
    render(<SuccessMessage message="Success" />);
    expect(screen.getByTestId('success-message')).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<SuccessMessage message="Success" />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<SuccessMessage message="Success" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByTestId('success-message-dismiss');
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders without dismiss button when onDismiss not provided', () => {
    render(<SuccessMessage message="Success" />);
    expect(screen.queryByTestId('success-message-dismiss')).not.toBeInTheDocument();
  });

  it('auto-hides after specified duration', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    
    render(<SuccessMessage message="Success" onDismiss={onDismiss} autoHideDuration={3000} />);
    
    expect(screen.getByTestId('success-message')).toBeInTheDocument();
    
    vi.advanceTimersByTime(3000);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
    
    vi.useRealTimers();
  });

  it('applies custom className', () => {
    render(<SuccessMessage message="Success" className="custom-class" />);
    const element = screen.getByTestId('success-message');
    expect(element).toHaveClass('custom-class');
    expect(element).toHaveClass('success-message');
  });
});
