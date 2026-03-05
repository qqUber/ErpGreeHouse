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
        <div style={{ 
          fontWeight: 'var(--font-weight-extrabold)', 
          fontSize: 'var(--font-size-xl)'
        }}>
          Оперативные данные
        </div>
        <span style={{ 
          fontSize: 'var(--font-size-sm)', 
          color: 'var(--muted)'
        }}>
          Дата: {new Date(data.date).toLocaleDateString('ru-RU')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Metrics */}
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="card cardCompact">
              <div style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--muted)'
              }}>
                Активный персонал
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-2xl)', 
                fontWeight: 'var(--font-weight-extrabold)', 
                marginTop: 'var(--spacing-xs)'
              }}>
                {data.active_staff}
              </div>
            </div>
            <div className="card cardCompact">
              <div style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--muted)'
              }}>
                Всего транз.
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-2xl)', 
                fontWeight: 'var(--font-weight-extrabold)', 
                marginTop: 'var(--spacing-xs)'
              }}>
                {data.total_transactions}
              </div>
            </div>
            <div className="card cardCompact">
              <div style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--muted)'
              }}>
                Сумма продаж
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-2xl)', 
                fontWeight: 'var(--font-weight-extrabold)', 
                marginTop: 'var(--spacing-xs)'
              }}>
                {data.total_revenue.toFixed(2)} ₽
              </div>
            </div>
            <div className="card cardCompact">
              <div style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--muted)'
              }}>
                Средний чек
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-2xl)', 
                fontWeight: 'var(--font-weight-extrabold)', 
                marginTop: 'var(--spacing-xs)'
              }}>
                {data.average_check.toFixed(2)} ₽
              </div>
            </div>
          </div>

          {/* Peak Hour */}
          <div className="card cardCompact" style={{ 
            background: 'var(--primary-light)', 
            borderColor: 'rgba(59, 130, 246, 0.25)'
          }}>
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--primary)'
            }}>
              Пиковый час
            </div>
            <div style={{ 
              fontSize: 'var(--font-size-2xl)', 
              fontWeight: 'var(--font-weight-extrabold)', 
              marginTop: 'var(--spacing-xs)', 
              color: 'var(--primary)'
            }}>
              {data.peak_hour}:00 ({data.peak_hour_transactions} транз.)
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div>
          <div style={{ 
            fontSize: 'var(--font-size-sm)', 
            fontWeight: 'var(--font-weight-semibold)', 
            color: 'var(--text)', 
            marginBottom: 'var(--spacing-sm)'
          }}>
            Топ товаров
          </div>
          <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
            {data.top_products.slice(0, 5).map((product) => (
              <div
                key={product.code}
                className="row"
                style={{ 
                  padding: 'var(--spacing-sm)', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'var(--brand-light)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary-light)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--brand-light)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: 'var(--font-size-sm)', 
                    fontWeight: 'var(--font-weight-semibold)', 
                    color: 'var(--text)'
                  }}>
                    {product.name}
                  </div>
                  <div style={{ 
                    fontSize: 'var(--font-size-xs)', 
                    color: 'var(--muted)'
                  }}>
                    {product.code}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: 'var(--font-size-sm)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: 'var(--text)'
                  }}>
                    {product.quantity} шт
                  </div>
                  <div style={{ 
                    fontSize: 'var(--font-size-xs)', 
                    color: 'var(--muted)'
                  }}>
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
        <div style={{ marginTop: 'var(--spacing-xl)' }}>
          <div style={{ 
            fontSize: 'var(--font-size-sm)', 
            fontWeight: 'var(--font-weight-semibold)', 
            color: 'var(--text)', 
            marginBottom: 'var(--spacing-sm)'
          }}>
            Продажи по часам
          </div>
          <div className="card cardCompact" style={{ 
            background: 'var(--brand-light)'
          }}>
            <div className="grid grid-cols-12 gap-2">
              {data.hourly_breakdown.map((hourData) => (
                <div
                  key={hourData.hour}
                  style={{ textAlign: 'center' }}
                >
                  <div style={{ 
                    fontSize: 'var(--font-size-xs)', 
                    color: 'var(--muted)'
                  }}>
                    {hourData.hour}:00
                  </div>
                  <div style={{ 
                    fontSize: 'var(--font-size-sm)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: 'var(--text)'
                  }}>
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