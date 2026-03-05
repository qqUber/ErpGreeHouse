import React from 'react';
import { Dashboard } from '../../api';

interface OperatorDashboardProps {
  dash: Dashboard | null;
  onNavigate: (tab: string, params?: Record<string, string | number>) => void;
}

export function OperatorDashboard({ dash, onNavigate }: OperatorDashboardProps) {
  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions - Operator's most frequent tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          className="card cardFull p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          onClick={() => onNavigate('pos')}
        >
          <div className="text-4xl mb-4">💰</div>
          <div className="font-bold text-lg">Новая продажа</div>
          <div className="text-muted mt-2">Сканировать QR или вводить телефон</div>
        </button>
        
        <button
          className="card cardFull p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          onClick={() => onNavigate('customers')}
        >
          <div className="text-4xl mb-4">🔍</div>
          <div className="font-bold text-lg">Идентифицировать клиента</div>
          <div className="text-muted mt-2">Поиск по телефону или QR</div>
        </button>
        
        <button
          className="card cardFull p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          onClick={() => onNavigate('products')}
        >
          <div className="text-4xl mb-4">📦</div>
          <div className="font-bold text-lg">Каталог товаров</div>
          <div className="text-muted mt-2">Просмотреть и обновить ассортимент</div>
        </button>
      </div>

      {/* Current Shift Stats - Focus on today's performance */}
      {dash && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">Продаж за день</span>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold">{dash.sales_count}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">Выручка</span>
              <span className="text-2xl">💵</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(dash.sales_total)}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">Начислено баллов</span>
              <span className="text-2xl text-green-500">📈</span>
            </div>
            <div className="text-3xl font-bold">{dash.bonus_earned}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">Списано баллов</span>
              <span className="text-2xl text-orange-500">📉</span>
            </div>
            <div className="text-3xl font-bold">{dash.bonus_used}</div>
          </div>
        </div>
      )}

      {/* Recent Transactions - Show only last 5 for quick reference */}
      {dash && dash.recent_activity.transactions.length > 0 && (
        <div className="card cardFull">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">Последние операции</div>
            <span className="text-muted text-sm">Показано {Math.min(5, dash.recent_activity.transactions.length)} из {dash.recent_activity.transactions.length}</span>
          </div>
          
          <div className="space-y-4">
            {dash.recent_activity.transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-bold">#{tx.id}</span>
                  </div>
                  <div>
                    <div className="font-semibold">{tx.customer_name || 'Клиент'}</div>
                    <div className="text-muted text-sm">{new Date(tx.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(tx.total_amount)}</div>
                  <div className="text-green-500 text-sm">+{tx.bonus_earned} баллов</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button 
              className="btn btnPrimary"
              onClick={() => onNavigate('pos')}
            >
              Провести новую операцию
            </button>
          </div>
        </div>
      )}

      {/* Empty State if No Recent Transactions */}
      {(!dash || dash.recent_activity.transactions.length === 0) && (
        <div className="card cardFull text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <div className="font-bold text-lg mb-2">Нет операций за сегодня</div>
          <div className="text-muted mb-6">Начните с первой продажи</div>
          <button 
            className="btn btnPrimary"
            onClick={() => onNavigate('pos')}
          >
            Провести первую продажу
          </button>
        </div>
      )}
    </div>
  );
}
