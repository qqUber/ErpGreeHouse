import React from 'react';

interface Customer {
  id: number;
  name: string;
  phone: string;
  total_spent: number;
  transactions: number;
}

interface Birthday {
  id: number;
  name: string;
  birthday: string;
}

interface LoyaltyTier {
  tier: string;
  count: number;
}

interface CustomerData {
  new_customers: {
    today: number;
    this_week: number;
    this_month: number;
  };
  new_customers_timeline: Array<{
    date: string;
    count: number;
  }>;
  top_customers: Customer[];
  birthdays_this_week: Birthday[];
  loyalty_tiers: LoyaltyTier[];
  total_customers: number;
}

interface CustomersWidgetProps {
  data: CustomerData;
}

export const CustomersWidget: React.FC<CustomersWidgetProps> = ({ data }) => {
  return (
    <div className="card cardFull" data-testid="admin_widget_customers_en" role="region" aria-label="Customers">
      <div className="row mb-4">
        <div style={{ 
          fontWeight: 'var(--font-weight-extrabold)', 
          fontSize: 'var(--font-size-xl)'
        }}>
          Клиенты
        </div>
        <span style={{ 
          fontSize: 'var(--font-size-sm)', 
          color: 'var(--muted)'
        }}>
          Всего: {data.total_customers}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
        {/* New Customers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card cardCompact">
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--muted)'
            }}>
              Сегодня
            </div>
            <div style={{ 
              fontSize: 'var(--font-size-2xl)', 
              fontWeight: 'var(--font-weight-extrabold)', 
              marginTop: 'var(--spacing-xs)'
            }}>
              {data.new_customers.today}
            </div>
          </div>
          <div className="card cardCompact">
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--muted)'
            }}>
              На неделе
            </div>
            <div style={{ 
              fontSize: 'var(--font-size-2xl)', 
              fontWeight: 'var(--font-weight-extrabold)', 
              marginTop: 'var(--spacing-xs)'
            }}>
              {data.new_customers.this_week}
            </div>
          </div>
          <div className="card cardCompact">
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--muted)'
            }}>
              В этом месяце
            </div>
            <div style={{ 
              fontSize: 'var(--font-size-2xl)', 
              fontWeight: 'var(--font-weight-extrabold)', 
              marginTop: 'var(--spacing-xs)'
            }}>
              {data.new_customers.this_month}
            </div>
          </div>
        </div>

        {/* Top Customers */}
        {data.top_customers.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text)', 
              marginBottom: 'var(--spacing-sm)'
            }}>
              Топ клиентов
            </div>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              {data.top_customers.slice(0, 5).map((customer) => (
                <div
                  key={customer.id}
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
                      {customer.name}
                    </div>
                    <div style={{ 
                      fontSize: 'var(--font-size-xs)', 
                      color: 'var(--muted)'
                    }}>
                      {customer.phone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      fontWeight: 'var(--font-weight-bold)', 
                      color: 'var(--text)'
                    }}>
                      {customer.total_spent.toFixed(2)} ₽
                    </div>
                    <div style={{ 
                      fontSize: 'var(--font-size-xs)', 
                      color: 'var(--muted)'
                    }}>
                      {customer.transactions} транз.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Birthdays */}
        {data.birthdays_this_week.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text)', 
              marginBottom: 'var(--spacing-sm)'
            }}>
              Дни рождения
            </div>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              {data.birthdays_this_week.map((birthday) => (
                <div
                  key={birthday.id}
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
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text)' }}>
                    {birthday.name}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>
                    {new Date(birthday.birthday).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loyalty Tiers */}
        {data.loyalty_tiers.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text)', 
              marginBottom: 'var(--spacing-sm)'
            }}>
              Лояльность
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {data.loyalty_tiers.map((tier, index) => (
                <div
                  key={index}
                  className="card cardCompact"
                  style={{ 
                    textAlign: 'center',
                    background: 'var(--brand-light)'
                  }}
                >
                  <div style={{ 
                    fontSize: 'var(--font-size-xs)', 
                    color: 'var(--muted)'
                  }}>
                    {tier.tier}
                  </div>
                  <div style={{ 
                    fontSize: 'var(--font-size-lg)', 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: 'var(--text)'
                  }}>
                    {tier.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};