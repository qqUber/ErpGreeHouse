import React from 'react';

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
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Оперативные данные</h3>
        <span className="text-sm text-gray-600">
          Дата: {new Date(data.date).toLocaleDateString('ru-RU')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Активный персонал</div>
              <div className="text-2xl font-semibold text-gray-900">{data.active_staff}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Всего транз.</div>
              <div className="text-2xl font-semibold text-gray-900">{data.total_transactions}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Сумма продаж</div>
              <div className="text-2xl font-semibold text-gray-900">
                {data.total_revenue.toFixed(2)} ₽
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Средний чек</div>
              <div className="text-2xl font-semibold text-gray-900">
                {data.average_check.toFixed(2)} ₽
              </div>
            </div>
          </div>

          {/* Peak Hour */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-blue-600">Пиковый час</div>
            <div className="text-2xl font-semibold text-blue-900">
              {data.peak_hour}:00 ({data.peak_hour_transactions} транз.)
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Топ товаров</h4>
          <div className="space-y-2">
            {data.top_products.slice(0, 5).map((product) => (
              <div
                key={product.code}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.code}</div>
                </div>
                <div className="ml-3 text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {product.quantity} шт
                  </div>
                  <div className="text-xs text-gray-500">
                    {product.revenue.toFixed(2)} ₽
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Breakdown */}
      {data.hourly_breakdown.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Продажи по часам</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-12 gap-2">
              {data.hourly_breakdown.map((hourData) => (
                <div
                  key={hourData.hour}
                  className="text-center"
                >
                  <div className="text-xs text-gray-600">{hourData.hour}:00</div>
                  <div className="text-sm font-semibold text-gray-900">
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