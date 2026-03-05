import React from 'react';
import { Dashboard } from '../../api';

interface ManagerDashboardProps {
  dash: Dashboard | null;
  onNavigate: (tab: string, params?: Record<string, string | number>) => void;
}

export function ManagerDashboard({ dash, onNavigate }: ManagerDashboardProps) {
  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards - Focus on business performance */}
      {dash && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">Всего клиентов</span>
              <span className="text-2xl text-blue-500">👥</span>
            </div>
            <div className="text-3xl font-bold">{dash.customers_total}</div>
            <div className="text-green-500 text-sm mt-2">+5 за сегодня</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">Средний чек</span>
              <span className="text-2xl text-purple-500">💳</span>
            </div>
            <div className="text-3xl font-bold">
              {dash.sales_count > 0 ? formatCurrency(dash.sales_total / dash.sales_count) : '—'}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">Чистый баланс</span>
              <span className="text-2xl text-green-500">📊</span>
            </div>
            <div className="text-3xl font-bold">{dash.bonus_earned - dash.bonus_used}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">Лояльность %</span>
              <span className="text-2xl text-orange-500">❤️</span>
            </div>
            <div className="text-3xl font-bold">
              {dash.sales_count > 0 ? Math.round((dash.bonus_used / dash.sales_count) * 100) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Marketing & Campaign Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Campaigns */}
        <div className="card cardFull">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">Активные кампании</div>
            <button 
              className="btn btnPrimary"
              onClick={() => onNavigate('marketing')}
            >
              Управлять
            </button>
          </div>
          
          <div className="space-y-4">
            {[1, 2].map((campaign) => (
              <div key={campaign} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-500 font-bold">📢</span>
                  </div>
                  <div>
                    <div className="font-semibold">Кампания {campaign}</div>
                    <div className="text-muted text-sm">Активна • 2 дня</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">+12%</div>
                  <div className="text-muted text-sm">клиентов</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Marketing Events */}
        <div className="card cardFull">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">Последние события</div>
            <button 
              className="btn"
              onClick={() => onNavigate('marketing')}
            >
              Смотреть все
            </button>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((event) => (
              <div key={event} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-500 font-bold">✉️</span>
                  </div>
                  <div>
                    <div className="font-semibold">Событие {event}</div>
                    <div className="text-muted text-sm">Отправлено • 10:30</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{50 + event * 20}</div>
                  <div className="text-muted text-sm">сообщений</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Trend & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart Placeholder */}
        <div className="card cardFull">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">Тренд продаж</div>
            <button 
              className="btn"
              onClick={() => onNavigate('analytics')}
            >
              Аналитика
            </button>
          </div>
          
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-muted">График продаж за период</div>
          </div>
        </div>

        {/* Top Products */}
        <div className="card cardFull">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">Популярные товары</div>
            <button 
              className="btn"
              onClick={() => onNavigate('products')}
            >
              Каталог
            </button>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((product) => (
              <div key={product} className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-500 font-bold">☕</span>
                  </div>
                  <div>
                    <div className="font-semibold">Продукт {product}</div>
                    <div className="text-muted text-sm">Категория • Цена</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{100 + product * 50}</div>
                  <div className="text-muted text-sm">продаж</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integrations Status */}
      <div className="card cardFull">
        <div className="flex items-center justify-between mb-6">
          <div className="font-bold text-lg">Интеграции</div>
          <div className="flex gap-2">
            <span className="pill pillGood">Telegram ✓</span>
            <span className="pill pillGood">VK ✓</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="font-semibold mb-2">Telegram Bot</div>
            <div className="text-muted text-sm">Опубликован • 500 подписчиков</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="font-semibold mb-2">VK Community</div>
            <div className="text-muted text-sm">Активен • 300 подписчиков</div>
          </div>
        </div>
      </div>
    </div>
  );
}
