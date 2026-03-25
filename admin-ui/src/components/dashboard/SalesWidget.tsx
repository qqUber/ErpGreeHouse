import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';
import { StatCard } from '../ui/StatCard';

type SalesData = {
  total_revenue?: number;
  total_transactions?: number;
  average_check?: number;
  peak_hour?: number | null;
  peak_hour_transactions?: number;
  top_products?: Array<{ name?: string; quantity?: number; revenue?: number }>;
  hourly_breakdown?: Array<{ hour?: number; transactions?: number; revenue?: number }>;
};

export function SalesWidget({ data }: { data?: any }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const totalRevenue = Number(data?.revenue ?? 0);
  const transactions = Number(data?.transactions ?? 0);
  const avgCheck = Number(data?.avgCheck ?? 0);
  const thisWeek = totalRevenue;
  const peakHour = data?.peakHour ?? null;
  const peakHourTx = Number(data?.peakHourTransactions ?? 0);
  const topProducts: any[] = data?.topProducts ?? [];
  const topProductName = topProducts[0]?.name ?? '—';
  const firstHalfRevenue = Number(data?.firstHalfRevenue ?? 0);
  const secondHalfRevenue = Number(data?.secondHalfRevenue ?? 0);
  
  const getGrowthDisplay = (): { value: string; variant: 'info' | 'success' | 'warning' } => {
    if (!Number.isFinite(firstHalfRevenue) || !Number.isFinite(secondHalfRevenue)) {
      return { value: '—', variant: 'info' };
    }
    if (firstHalfRevenue === 0) {
      if (secondHalfRevenue === 0) return { value: '—', variant: 'info' };
      return { value: 'New', variant: 'success' };
    }
    const growth = Math.round(((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100);
    return {
      value: `${growth >= 0 ? '+' : ''}${growth}%`,
      variant: growth > 0 ? 'success' : growth < 0 ? 'warning' : 'info'
    };
  };
  
  const growthDisplay = getGrowthDisplay();

  const compactContent = (
    <StatCard
      variant="primary"
      value={`₽${totalRevenue.toLocaleString()}`}
      label={t('widgets.sales.totalSales')}
      className="stat-card-gradient stat-card-gradient-primary"
    />
  );

  const averageLabel = avgCheck > 0 ? t('widgets.sales.dailyAverage') : t('widgets.sales.dailyAverage', 'Average per day');
  const averageHelper = avgCheck > 0 ? 'Shown as dashboard period average' : 'No period data available';
  const thisWeekLabel = t('widgets.sales.thisWeek', 'Sales this week');

  const expandedContent = (
    <div className="dashboard-widget-2026">
      <h3 className="section-title-2026">{t('widgets.sales.details')}</h3>
      <section className="crm-collapsible-section mb-4">
        <h4 className="crm-section-title">{t('widgets.sales.summary', 'Sales snapshot')}</h4>
        <div className="crm-list">
          <div className="crm-customer-row">
            <div className="crm-customer-main"><span className="crm-customer-name">{t('widgets.sales.totalSales')}</span></div>
            <div className="crm-customer-badges"><span className="crm-badge crm-badge-value">₽{totalRevenue.toLocaleString()}</span><span className="crm-badge crm-badge-muted">Period total</span></div>
          </div>
          <div className="crm-customer-row">
            <div className="crm-customer-main"><span className="crm-customer-name">{t('widgets.sales.transactions')}</span></div>
            <div className="crm-customer-badges"><span className="crm-badge crm-badge-good">{transactions}</span><span className="crm-badge crm-badge-muted">Completed orders</span></div>
          </div>
          <div className="crm-customer-row">
            <div className="crm-customer-main"><span className="crm-customer-name">{averageLabel}</span></div>
            <div className="crm-customer-badges"><span className="crm-badge crm-badge-value">₽{avgCheck.toLocaleString()}</span><span className="crm-badge crm-badge-muted">{averageHelper}</span></div>
          </div>
          <div className="crm-customer-row">
            <div className="crm-customer-main"><span className="crm-customer-name">{t('widgets.sales.peakHour')}</span></div>
            <div className="crm-customer-badges"><span className="crm-badge crm-badge-warn">{peakHour == null ? '—' : `${peakHour}:00`}</span><span className="crm-badge crm-badge-muted">{peakHourTx > 0 ? `${peakHourTx} tx` : 'No peak data'}</span></div>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('widgets.sales.topProduct')}</h4>
        <div className="crm-customer-row">
          <div className="crm-customer-main">
            <span className="crm-customer-name">{topProductName}</span>
          </div>
          <div className="crm-customer-badges">
            <span className="crm-badge crm-badge-value">{topProducts.length > 0 ? t('widgets.sales.topItems') : 'No top items available'}</span>
          </div>
        </div>
      </div>

      {topProducts.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('widgets.sales.topItems')}</h4>
          <div className="space-y-2">
            {topProducts.slice(0, 3).map((p: any, idx: number) => (
              <div key={`${p.name || 'product'}-${idx}`} className="crm-customer-row">
                <div className="crm-customer-main">
                  <span className="crm-customer-name">{p.name || '—'}</span>
                </div>
                <div className="crm-customer-badges">
                  <span className="crm-badge crm-badge-good">{Number(p.quantity || 0)}</span>
                  <span className="crm-badge crm-badge-value">₽{Number(p.revenue || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="crm-customer-row">
          <div className="crm-customer-main">
            <span className="crm-customer-name">{t('widgets.sales.growth')}</span>
          </div>
          <div className="crm-customer-badges">
            <span className={`crm-badge ${growthDisplay.variant === 'success' ? 'crm-badge-good' : growthDisplay.variant === 'warning' ? 'crm-badge-warn' : 'crm-badge-value'}`}>{growthDisplay.value}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Widget
      title={t('sales.title')}
      isExpanded={isExpanded}
      onExpand={() => setIsExpanded(true)}
      onCollapse={() => setIsExpanded(false)}
      compactContent={compactContent}
      expandedContent={expandedContent}
    />
  );
}
