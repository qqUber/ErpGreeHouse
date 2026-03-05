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
    <div className="card cardFull">
      <div className="row mb-4">
        <div style={{ fontWeight: 800, fontSize: 16 }}>Клиенты</div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          Всего: {data.total_customers}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {/* New Customers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Сегодня</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{data.new_customers.today}</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>На неделе</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{data.new_customers.this_week}</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>В этом месяце</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{data.new_customers.this_month}</div>
          </div>
        </div>

        {/* Top Customers */}
        {data.top_customers.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 8 
            }}>
              Топ клиентов
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {data.top_customers.slice(0, 5).map((customer) => (
                <div
                  key={customer.id}
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
                      {customer.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{customer.phone}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                      {customer.total_spent.toFixed(2)} ₽
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
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
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 8 
            }}>
              Дни рождения
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {data.birthdays_this_week.map((birthday) => (
                <div
                  key={birthday.id}
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
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{birthday.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
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
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 8 
            }}>
              Лояльность
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {data.loyalty_tiers.map((tier, index) => (
                <div
                  key={index}
                  className="card"
                  style={{ 
                    padding: 8, 
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.5)'
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tier.tier}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{tier.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};