import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';

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
    <div className="kpi-card-2026 animate-fade-in-up">
      <div className="kpi-value-2026">₽{totalRevenue.toLocaleString()}</div>
      <div className="kpi-label-2026">{t('widgets.sales.totalSales')}</div>
    </div>
  );

  const expandedContent = (
    <div className="dashboard-widget-2026">
      <h3 className="section-title-2026">{t('widgets.sales.details')}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card-2026 stat-card-2026-primary">
          <div className="kpi-label-2026">{t('widgets.sales.totalSales')}</div>
          <div className="kpi-value-2026 text-xl">₽{totalRevenue.toLocaleString()}</div>
        </div>
        <div className="stat-card-2026 stat-card-2026-info">
          <div className="kpi-label-2026">{t('widgets.sales.transactions')}</div>
          <div className="kpi-value-2026 text-xl text-indigo-600">{transactions}</div>
        </div>
        <div className="stat-card-2026 stat-card-2026-success">
          <div className="kpi-label-2026">{t('widgets.sales.dailyAverage')}</div>
          <div className="kpi-value-2026 text-xl text-green-600">₽{avgCheck.toLocaleString()}</div>
        </div>
        <div className="stat-card-2026 stat-card-2026-warning">
          <div className="kpi-label-2026">{t('widgets.sales.peakHour')}</div>
          <div className="kpi-value-2026 text-xl text-amber-600">
            {peakHour == null ? '—' : `${peakHour}:00`} {peakHourTx > 0 ? `(${peakHourTx})` : ''}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('widgets.sales.topProduct')}</h4>
        <div className="row-item-2026">
          <span className="font-medium">{topProductName}</span>
          <span className="badge-2026 badge-2026-primary">Top</span>
        </div>
      </div>

      {topProducts.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('widgets.sales.topItems')}</h4>
          <div className="space-y-2">
            {topProducts.slice(0, 3).map((p: any, idx: number) => (
              <div
                key={`${p.name || 'product'}-${idx}`}
                className="row-item-2026"
              >
                <span className="text-sm text-gray-600">{p.name || '—'}</span>
                <span className="text-sm font-semibold text-gray-800">
                  {Number(p.quantity || 0)} · ₽{Number(p.revenue || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className={`stat-card-2026 stat-card-2026-${growthDisplay.variant === 'success' ? 'success' : growthDisplay.variant === 'warning' ? 'warning' : 'info'}`}>
          <div className="kpi-label-2026">{t('widgets.sales.growth')}</div>
          <div className={`kpi-value-2026 text-2xl ${growthDisplay.variant === 'success' ? 'text-green-600' : growthDisplay.variant === 'warning' ? 'text-amber-600' : 'text-blue-600'}`}>
            {growthDisplay.value}
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
    >
      <div className="dashboard-widget-2026 p-4">
        <div className="space-y-4">
          <div className="row-item-2026">
            <span className="text-sm text-gray-600">{t('widgets.sales.totalSales')}</span>
            <span className="text-lg font-semibold text-gray-800">₽{totalRevenue.toLocaleString()}</span>
          </div>
          <div className="row-item-2026">
            <span className="text-sm text-gray-600">{t('date.thisWeek')}</span>
            <span className="text-lg font-semibold text-blue-600">₽{thisWeek.toLocaleString()}</span>
          </div>
          <div className="row-item-2026">
            <span className="text-sm text-gray-600">{t('widgets.sales.dailyAverage')}</span>
            <span className="text-lg font-semibold text-green-600">₽{avgCheck.toLocaleString()}</span>
          </div>
          <div className={`stat-card-2026 stat-card-2026-${growthDisplay.variant === 'success' ? 'success' : growthDisplay.variant === 'warning' ? 'warning' : 'info'}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('widgets.sales.growth')}</span>
              <span className={`text-xl font-bold ${growthDisplay.variant === 'success' ? 'text-green-600' : growthDisplay.variant === 'warning' ? 'text-amber-600' : 'text-blue-600'}`}>
                {growthDisplay.value}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}
