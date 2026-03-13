import { render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { PerformanceWidget } from './PerformanceWidget';

// Mock react-i18next
i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        dashboardAdmin: {
          performance: 'Performance',
          transactions: 'Transactions',
          revenue: 'Revenue',
          pointsEarned: 'Points Earned',
          pointsRedeemed: 'Points Redeemed',
        },
      },
    },
  },
  debug: false,
});

// Mock ReactECharts
vi.mock('echarts-for-react', () => ({
  default: vi.fn(() => <div data-testid="chart-mock" />),
}));

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

describe('PerformanceWidget Component', () => {
  const mockData = [
    {
      date: '2024-01-01',
      transactions: 10,
      revenue: 1000,
      points_earned: 500,
      points_redeemed: 200,
      active_customers: 5,
      conversion_rate: 0.1,
    },
    {
      date: '2024-01-02',
      transactions: 15,
      revenue: 1500,
      points_earned: 750,
      points_redeemed: 300,
      active_customers: 8,
      conversion_rate: 0.15,
    },
  ];

  it('should display title', () => {
    renderWithI18n(<PerformanceWidget data={mockData} />);
    expect(screen.getByText('Performance')).toBeInTheDocument();
  });

  it('should render chart', () => {
    renderWithI18n(<PerformanceWidget data={mockData} />);
    expect(screen.getByTestId('chart-mock')).toBeInTheDocument();
  });

  it('should display performance metrics', () => {
    renderWithI18n(<PerformanceWidget data={mockData} />);

    expect(screen.getByText('15')).toBeInTheDocument(); // Transactions
    expect(screen.getByText('1 500 ₽')).toBeInTheDocument(); // Revenue
    expect(screen.getByText('750')).toBeInTheDocument(); // Points Earned
    expect(screen.getByText('300')).toBeInTheDocument(); // Points Redeemed
  });

  it('should display metric labels', () => {
    renderWithI18n(<PerformanceWidget data={mockData} />);

    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Points Earned')).toBeInTheDocument();
    expect(screen.getByText('Points Redeemed')).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    renderWithI18n(<PerformanceWidget data={[]} />);
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('should display correct metric colors', () => {
    renderWithI18n(<PerformanceWidget data={mockData} />);

    expect(screen.getByTestId('stat-card-primary')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-success')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-info')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-warning')).toBeInTheDocument();
  });
});
