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
  const averageHelper = avgCheck > 0 ? t('widgets.sales.periodAverageHelper', 'Shown as dashboard period average') : t('widgets.sales.noPeriodData', 'No period data available');
  const thisWeekLabel = t('widgets.sales.thisWeekSales', 'Sales this week');
  const periodTotalLabel = t('widgets.sales.periodTotal', 'Period total');
  const completedOrdersLabel = t('widgets.sales.completedOrders', 'Completed orders');
  const noPeakDataLabel = t('widgets.sales.noPeakData', 'No peak data');
  const noTopItemsLabel = t('widgets.sales.noTopItems', 'No top items available');

  const expandedContent = (
    <div className="dashboard-widget-2026">
      <h3 className="section-title-2026">{t('widgets.sales.details')}</h3>
      <section className="mb-4">
        <h4 className="section-title-2026">{t('widgets.sales.summaryTitle', 'Sales snapshot')}</h4>
        <div className="space-y-2">
          <div className="row-item-2026">
            <span className="font-medium">{t('widgets.sales.totalSales')}</span>
            <div className="flex items-center gap-2">
              <span className="badge-2026 badge-2026-primary">₽{totalRevenue.toLocaleString()}</span>
              <span className="badge-2026">{periodTotalLabel}</span>
            </div>
          </div>
          <div className="row-item-2026">
            <span className="font-medium">{t('widgets.sales.transactions')}</span>
            <div className="flex items-center gap-2">
              <span className="badge-2026 badge-2026-success">{transactions}</span>
              <span className="badge-2026">{completedOrdersLabel}</span>
            </div>
          </div>
          <div className="row-item-2026">
            <span className="font-medium">{averageLabel}</span>
            <div className="flex items-center gap-2">
              <span className="badge-2026 badge-2026-primary">₽{avgCheck.toLocaleString()}</span>
              <span className="badge-2026">{averageHelper}</span>
            </div>
          </div>
          <div className="row-item-2026">
            <span className="font-medium">{t('widgets.sales.peakHour')}</span>
            <div className="flex items-center gap-2">
              <span className="badge-2026 badge-2026-warning">{peakHour == null ? '—' : `${peakHour}:00`}</span>
              <span className="badge-2026">{peakHourTx > 0 ? `${peakHourTx} ${t('widgets.sales.txSuffix', 'tx')}` : noPeakDataLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <h4 className="section-title-2026">{t('widgets.sales.topProduct')}</h4>
        <div className="row-item-2026 mt-2">
          <span className="font-medium">{topProductName}</span>
          <span className="badge-2026 badge-2026-primary">
            {topProducts.length > 0 ? t('widgets.sales.topItems') : noTopItemsLabel}
          </span>
        </div>
      </div>

      {topProducts.length > 0 ? (
        <div className="mt-4">
          <h4 className="section-title-2026">{t('widgets.sales.topItems')}</h4>
          <div className="space-y-2 mt-2">
            {topProducts.slice(0, 3).map((p: any, idx: number) => (
              <div key={`${p.name || 'product'}-${idx}`} className="row-item-2026">
                <span className="font-medium">{p.name || '—'}</span>
                <div className="flex items-center gap-2">
                  <span className="badge-2026 badge-2026-success">{Number(p.quantity || 0)}</span>
                  <span className="badge-2026 badge-2026-primary">₽{Number(p.revenue || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="row-item-2026">
          <span className="font-medium">{t('widgets.sales.growth')}</span>
          <span className={`badge-2026 ${growthDisplay.variant === 'success' ? 'badge-2026-success' : growthDisplay.variant === 'warning' ? 'badge-2026-warning' : 'badge-2026-primary'}`}>
            {growthDisplay.value}
          </span>
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
