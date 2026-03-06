import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dashboard } from '../../api';

interface OperatorDashboardProps {
  dash: Dashboard | null;
  onNavigate: (tab: string, params?: Record<string, string | number>) => void;
}

export function OperatorDashboard({ dash, onNavigate }: OperatorDashboardProps) {
  const { t } = useTranslation();
  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  };

  return (
    <div className="space-y-6" data-testid="operator_dashboard_en">
      {/* Quick Actions - Operator's most frequent tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6" data-testid="operator_widget_quick_actions_en">
        <button
          className="card cardFull p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          onClick={() => onNavigate('pos')}
          data-testid="operator_btn_new_sale_en"
        >
          <div className="text-4xl mb-4">💰</div>
          <div className="font-bold text-lg">{t('dashboardOperator.newSale')}</div>
          <div className="text-muted mt-2">{t('dashboardOperator.scanQRorPhone')}</div>
        </button>
        
        <button
          className="card cardFull p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          onClick={() => onNavigate('customers')}
          data-testid="operator_btn_identify_customer_en"
        >
          <div className="text-4xl mb-4">🔍</div>
          <div className="font-bold text-lg">{t('dashboardOperator.identifyCustomer')}</div>
          <div className="text-muted mt-2">{t('dashboardOperator.searchByPhoneQR')}</div>
        </button>
        
        <button
          className="card cardFull p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow"
          onClick={() => onNavigate('products')}
          data-testid="operator_btn_catalog_en"
        >
          <div className="text-4xl mb-4">📦</div>
          <div className="font-bold text-lg">{t('dashboardOperator.productCatalog')}</div>
          <div className="text-muted mt-2">{t('dashboardOperator.viewUpdateStock')}</div>
        </button>
      </div>

      {/* Current Shift Stats - Focus on today's performance */}
      {dash && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="operator_widget_shift_stats_en">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardOperator.salesPerDay')}</span>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold">{dash.sales_count}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardOperator.revenue')}</span>
              <span className="text-2xl">💵</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(dash.sales_total)}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardOperator.pointsAccrued')}</span>
              <span className="text-2xl text-green-500">📈</span>
            </div>
            <div className="text-3xl font-bold">{dash.bonus_earned}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardOperator.pointsWrittenOff')}</span>
              <span className="text-2xl text-orange-500">📉</span>
            </div>
            <div className="text-3xl font-bold">{dash.bonus_used}</div>
          </div>
        </div>
      )}

      {/* Recent Transactions - Show only last 5 for quick reference */}
      {dash && dash.recent_activity.transactions.length > 0 && (
        <div className="card cardFull" data-testid="operator_widget_recent_transactions_en">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">{t('dashboardOperator.recentOperations')}</div>
            <span className="text-muted text-sm">{t('dashboardOperator.showingOf', { shown: Math.min(5, dash.recent_activity.transactions.length), total: dash.recent_activity.transactions.length })}</span>
          </div>
          
          <div className="space-y-4">
            {dash.recent_activity.transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-bold">#{tx.id}</span>
                  </div>
                  <div>
                    <div className="font-semibold">{tx.customer_name || t('dashboardOperator.customer')}</div>
                    <div className="text-muted text-sm">{new Date(tx.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(tx.total_amount)}</div>
                  <div className="text-green-500 text-sm">{t('dashboardOperator.bonusPoints', { count: tx.bonus_earned })}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button 
              className="btn btnPrimary"
              onClick={() => onNavigate('pos')}
              data-testid="operator_btn_new_operation_en"
            >
              {t('dashboardOperator.newOperation')}
            </button>
          </div>
        </div>
      )}

      {/* Empty State if No Recent Transactions */}
      {(!dash || dash.recent_activity.transactions.length === 0) && (
        <div className="card cardFull text-center py-12" data-testid="operator_widget_empty_state_en">
          <div className="text-6xl mb-4">📊</div>
          <div className="font-bold text-lg mb-2">{t('dashboardOperator.noOperationsToday')}</div>
          <div className="text-muted mb-6">{t('dashboardOperator.startWithFirstSale')}</div>
          <button 
            className="btn btnPrimary"
            onClick={() => onNavigate('pos')}
            data-testid="operator_btn_first_sale_en"
          >
            {t('dashboardOperator.firstSale')}
          </button>
        </div>
      )}
    </div>
  );
}
