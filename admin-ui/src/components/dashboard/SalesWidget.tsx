import React, { useState } from 'react';
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

export function SalesWidget({ data }: { data?: SalesData }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const totalRevenue = Number(data?.total_revenue ?? 0);
  const transactions = Number(data?.total_transactions ?? 0);
  const avgCheck = Number(data?.average_check ?? 0);
  const thisWeek = totalRevenue;
  const peakHour = data?.peak_hour;
  const peakHourTx = Number(data?.peak_hour_transactions ?? 0);
  const topProducts = data?.top_products || [];
  const topProductName = topProducts[0]?.name || '—';
  const recentHourly = (data?.hourly_breakdown || []).slice(-6);
  const firstHalfRevenue = recentHourly
    .slice(0, Math.floor(recentHourly.length / 2))
    .reduce((acc, h) => acc + Number(h?.revenue || 0), 0);
  const secondHalfRevenue = recentHourly
    .slice(Math.floor(recentHourly.length / 2))
    .reduce((acc, h) => acc + Number(h?.revenue || 0), 0);
  const growth =
    firstHalfRevenue > 0
      ? Math.round(((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100)
      : 0;

  const compactContent = (
    <div className="text-center">
      <div className="text-3xl font-bold text-purple-600">₽{totalRevenue.toLocaleString()}</div>
      <div className="text-sm text-gray-500">{t('widgets.sales.totalSales')}</div>
      <div className="text-sm text-gray-500 mt-1">
        {t('widgets.sales.growthThisWeek', { count: growth })}
      </div>
    </div>
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
        <div>
          <div className="text-sm text-gray-500">{t('widgets.sales.growth')}</div>
          <div
            className={`text-xl font-bold ${growth >= 0 ? 'text-green-600' : 'text-orange-600'}`}
          >
            {growth >= 0 ? '+' : ''}
            {growth}%
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
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.sales.growth')}</span>
          <span className="text-lg font-semibold text-green-600">+{growth}%</span>
        </div>
      </div>
    </Widget>
  );
}
