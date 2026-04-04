import React from 'react';
import { useTranslation } from 'react-i18next';

interface HourlyData {
  hour: number;
  transactions: number;
  revenue: number;
}

interface TopProduct {
  code: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface OperationalData {
  date: string;
  hourly_breakdown: HourlyData[];
  top_products: TopProduct[];
  active_staff: number;
  total_transactions: number;
  total_revenue: number;
  average_check: number;
  peak_hour: number;
  peak_hour_transactions: number;
}

interface OperationalWidgetProps {
  data: OperationalData;
}

export const OperationalWidget: React.FC<OperationalWidgetProps> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <div
      className="card cardFull"
      data-testid="admin_widget_operational_en"
      role="region"
      aria-label="Operational Data"
    >
      <div className="row mb-4">
        <div className="operational-widget-title">
          Оперативные данные
        </div>
        <span className="operational-widget-date">
          Дата: {new Date(data.date).toLocaleDateString('ru-RU')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <div className="operational-widget">
          <div className="grid grid-cols-2 gap-4">
            <div className="card cardCompact">
              <div className="operational-metric-label">
                Активный персонал
              </div>
              <div className="operational-metric-value">
                {data.active_staff}
              </div>
            </div>
            <div className="card cardCompact">
              <div className="operational-metric-label">
                Всего транз.
              </div>
              <div className="operational-metric-value">
                {data.total_transactions}
              </div>
            </div>
            <div className="card cardCompact">
              <div className="operational-metric-label">
                {t('analytics.revenue')}
              </div>
              <div className="operational-metric-value">
                {(data.total_revenue || 0).toFixed(2)} ₽
              </div>
            </div>
            <div className="card cardCompact">
              <div className="operational-metric-label">
                {t('analytics.averageCheck')}
              </div>
              <div className="operational-metric-value">
                {(data.average_check || 0).toFixed(2)} ₽
              </div>
            </div>
          </div>

          {/* Peak Hour */}
          <div className="card cardCompact operational-peak-card">
            <div className="operational-peak-label">
              Пиковый час
            </div>
            <div className="operational-peak-value">
              {data.peak_hour}:00 ({data.peak_hour_transactions} транз.)
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div>
          <div className="operational-section-title">
            Топ товаров
          </div>
          <div className="operational-widget">
            {(data.top_products || []).slice(0, 5).map((product: any) => (
              <div
                key={product.code}
                className="row operational-product-row"
              >
                <div className="flex-1">
                  <div className="operational-product-name">
                    {product.name}
                  </div>
                  <div className="operational-product-code">
                    {product.code}
                  </div>
                </div>
                <div className="text-right">
                  <div className="operational-product-qty">
                    {product.quantity} шт
                  </div>
                  <div className="operational-product-revenue">
                    {(product.revenue || 0).toFixed(2)} ₽
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Breakdown */}
      {(data.hourly_breakdown || []).length > 0 && (
        <div className="operational-hourly-section">
          <div className="operational-section-title">
            {t('analytics.salesByHour')}
          </div>
          <div className="card cardCompact operational-hourly-card">
            <div className="grid grid-cols-12 gap-2 operational-hourly-grid">
              {data.hourly_breakdown.map((hourData: any) => (
                <div key={hourData.hour} className="text-center">
                  <div className="operational-hour-label">
                    {hourData.hour}:00
                  </div>
                  <div className="operational-hour-value">
                    {hourData.transactions}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
