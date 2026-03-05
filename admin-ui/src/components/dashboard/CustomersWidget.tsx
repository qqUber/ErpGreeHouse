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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Клиенты</h3>
        <span className="text-sm text-gray-600">
          Всего: {data.total_customers}
        </span>
      </div>

      <div className="space-y-4">
        {/* New Customers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Сегодня</div>
            <div className="text-2xl font-semibold text-gray-900">{data.new_customers.today}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">На неделе</div>
            <div className="text-2xl font-semibold text-gray-900">{data.new_customers.this_week}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">В этом месяце</div>
            <div className="text-2xl font-semibold text-gray-900">{data.new_customers.this_month}</div>
          </div>
        </div>

        {/* Top Customers */}
        {data.top_customers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Топ клиентов</h4>
            <div className="space-y-2">
              {data.top_customers.slice(0, 5).map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                    <div className="text-xs text-gray-500">{customer.phone}</div>
                  </div>
                  <div className="ml-3 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {customer.total_spent.toFixed(2)} ₽
                    </div>
                    <div className="text-xs text-gray-500">
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Дни рождения</h4>
            <div className="space-y-2">
              {data.birthdays_this_week.map((birthday) => (
                <div
                  key={birthday.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                >
                  <div className="text-sm text-gray-900">{birthday.name}</div>
                  <div className="text-xs text-gray-500">
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Лояльность</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {data.loyalty_tiers.map((tier, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-2 text-center"
                >
                  <div className="text-xs text-gray-600">{tier.tier}</div>
                  <div className="text-lg font-semibold text-gray-900">{tier.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};