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
    <div className="card cardFull">
      <div className="row mb-4">
        <div style={{ fontWeight: 800, fontSize: 16 }}>Оперативные данные</div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          Дата: {new Date(data.date).toLocaleDateString('ru-RU')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Активный персонал</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{data.active_staff}</div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Всего транз.</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{data.total_transactions}</div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Сумма продаж</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
                {data.total_revenue.toFixed(2)} ₽
              </div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Средний чек</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
                {data.average_check.toFixed(2)} ₽
              </div>
            </div>
          </div>

          {/* Peak Hour */}
          <div className="card" style={{ 
            background: 'rgba(59, 130, 246, 0.06)', 
            borderColor: 'rgba(59, 130, 246, 0.25)',
            padding: 12
          }}>
            <div style={{ fontSize: 13, color: 'var(--primary)' }}>Пиковый час</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: 'var(--primary)' }}>
              {data.peak_hour}:00 ({data.peak_hour_transactions} транз.)
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div>
          <div style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            color: 'var(--text)', 
            marginBottom: 8 
          }}>
            Топ товаров
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {data.top_products.slice(0, 5).map((product) => (
              <div
                key={product.code}
                className="row"
                style={{ 
                  padding: 8, 
                  borderRadius: 8, 
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(0, 0, 0, 0.03)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{product.code}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {product.quantity} шт
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
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
        <div style={{ marginTop: 24 }}>
          <div style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            color: 'var(--text)', 
            marginBottom: 8 
          }}>
            Продажи по часам
          </div>
          <div className="card" style={{ 
            background: 'rgba(255, 255, 255, 0.5)',
            padding: 16
          }}>
            <div className="grid grid-cols-12 gap-2">
              {data.hourly_breakdown.map((hourData) => (
                <div
                  key={hourData.hour}
                  style={{ textAlign: 'center' }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{hourData.hour}:00</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
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