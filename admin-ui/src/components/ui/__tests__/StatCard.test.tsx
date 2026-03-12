import { render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { StatCard } from '../StatCard';
import '../StatCard.css';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: {} } },
  debug: false,
});

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

describe('StatCard', () => {
  it('renders value and label', () => {
    renderWithI18n(<StatCard value={150} label="Total Sales" />);
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Total Sales')).toBeInTheDocument();
  });

  it('renders string value', () => {
    renderWithI18n(<StatCard value="₽1,500" label="Revenue" />);
    expect(screen.getByText('₽1,500')).toBeInTheDocument();
  });

  it('renders primary variant by default', () => {
    renderWithI18n(<StatCard value={100} label="Test" />);
    const card = screen.getByTestId('stat-card-primary');
    expect(card).toHaveClass('stat-card-primary');
  });

  it('renders success variant', () => {
    renderWithI18n(<StatCard value={200} label="Test" variant="success" />);
    const card = screen.getByTestId('stat-card-success');
    expect(card).toHaveClass('stat-card-success');
  });

  it('renders warning variant', () => {
    renderWithI18n(<StatCard value={300} label="Test" variant="warning" />);
    const card = screen.getByTestId('stat-card-warning');
    expect(card).toHaveClass('stat-card-warning');
  });

  it('renders info variant', () => {
    renderWithI18n(<StatCard value={400} label="Test" variant="info" />);
    const card = screen.getByTestId('stat-card-info');
    expect(card).toHaveClass('stat-card-info');
  });

  it('renders icon when provided', () => {
    renderWithI18n(
      <StatCard value={500} label="Test" icon={<span data-testid="custom-icon">📊</span>} />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithI18n(<StatCard value={600} label="Test" className="custom-class" />);
    const card = screen.getByTestId('stat-card-primary');
    expect(card).toHaveClass('custom-class');
  });

  it('handles zero value', () => {
    renderWithI18n(<StatCard value={0} label="Empty" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles negative value', () => {
    renderWithI18n(<StatCard value={-50} label="Loss" />);
    expect(screen.getByText('-50')).toBeInTheDocument();
  });

  it('renders formatted currency string', () => {
    const formatted = new Intl.NumberFormat('ru-RU').format(123456);
    renderWithI18n(<StatCard value={`${formatted} ₽`} label="Revenue" />);
    expect(screen.getByText(`${formatted} ₽`)).toBeInTheDocument();
  });
});
