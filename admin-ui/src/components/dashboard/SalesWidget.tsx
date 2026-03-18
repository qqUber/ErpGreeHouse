import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../ui/StatCard';
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
  
  // Use dashboard API fields
  const totalRevenue = Number(data?.sales_total ?? 0);
  const transactions = Number(data?.sales_count ?? 0);
  const avgCheck = transactions > 0 ? totalRevenue / transactions : 0;
  const thisWeek = totalRevenue;
  const peakHour = null; // No peak hour data in API
  const peakHourTx = 0; // No peak hour data in API
  const topProducts = []; // No top products data in API
  const topProductName = '—';
  // Simplify since no detailed hourly data available
  const firstHalfRevenue = 0;
  const secondHalfRevenue = 0;
  const growth =
    Number.isFinite(firstHalfRevenue) && firstHalfRevenue > 0
      ? Math.round(((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100)
      : 0;

  const compactContent = (
    <StatCard
      variant="info"
      value={`₽${totalRevenue.toLocaleString()}`}
      label={t('widgets.sales.totalSales')}
    />
  );

  const expandedContent = (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('widgets.sales.details')}</h3>
      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-500">{t('widgets.sales.totalSales')}</div>
          <div className="text-xl font-bold">₽{totalRevenue.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('widgets.sales.transactions')}</div>
          <div className="text-xl font-bold">{transactions}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('widgets.sales.dailyAverage')}</div>
          <div className="text-xl font-bold">₽{avgCheck.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('widgets.sales.peakHour')}</div>
          <div className="text-xl font-bold">
            {peakHour == null ? '—' : `${peakHour}:00`} {peakHourTx > 0 ? `(${peakHourTx})` : ''}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('widgets.sales.topProduct')}</div>
          <div className="text-xl font-bold">{topProductName}</div>
        </div>
        {topProducts.length > 0 ? (
          <div>
            <div className="text-sm text-gray-500">{t('widgets.sales.topItems')}</div>
            <div className="space-y-4">
              {topProducts.slice(0, 3).map((p, idx) => (
                <div
                  key={`${p.name || 'product'}-${idx}`}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-gray-500">{p.name || '—'}</span>
                  <span className="text-sm font-semibold">
                    {Number(p.quantity || 0)} · ₽{Number(p.revenue || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <StatCard
          variant={growth >= 0 ? 'success' : 'warning'}
          value={`${growth >= 0 ? '+' : ''}${growth}%`}
          label={t('widgets.sales.growth')}
        />
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.sales.totalSales')}</span>
          <span className="text-lg font-semibold">₽{totalRevenue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('date.thisWeek')}</span>
          <span className="text-lg font-semibold">₽{thisWeek.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.sales.dailyAverage')}</span>
          <span className="text-lg font-semibold">₽{avgCheck.toLocaleString()}</span>
        </div>
        <StatCard
          variant={growth >= 0 ? 'success' : 'warning'}
          value={`${growth >= 0 ? '+' : ''}${growth}%`}
          label={t('widgets.sales.growth')}
        />
      </div>
    </Widget>
  );
}
