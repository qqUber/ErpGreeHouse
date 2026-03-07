import React from 'react';
import { useTranslation } from 'react-i18next';
import type { OperationalData } from '../../hooks/useDashboard';

interface OperatorDashboardProps {
  data?: {
    operational?: OperationalData | null;
  } | null;
  onNavigate: (tab: string, params?: Record<string, string | number>) => void;
}

export function OperatorDashboard({ data, onNavigate }: OperatorDashboardProps) {
  const { t } = useTranslation();
  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  };

  return (
    <div className="space-y-6 stagger-children" data-testid="operator_dashboard_en">
      {/* Quick Actions - Operator's most frequent tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6" data-testid="operator_widget_quick_actions_en">
        <button
          className="card cardFull p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow tooltip"
          onClick={() => onNavigate('pos')}
          data-testid="operator_btn_new_sale_en"
          data-tooltip={t('dashboardOperator.newSaleTooltip')}
        >
          <div className="text-4xl mb-4">💰</div>
          <div className="font-bold text-lg">{t('dashboardOperator.newSale')}</div>
          <div className="text-muted mt-2">{t('dashboardOperator.scanQRorPhone')}</div>
        </button>
        
        <button
          className="card cardFull p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow tooltip"
          onClick={() => onNavigate('customers')}
          data-testid="operator_btn_identify_customer_en"
          data-tooltip={t('dashboardOperator.identifyTooltip')}
        >
          <div className="text-4xl mb-4">🔍</div>
          <div className="font-bold text-lg">{t('dashboardOperator.identifyCustomer')}</div>
          <div className="text-muted mt-2">{t('dashboardOperator.searchByPhoneQR')}</div>
        </button>
        
        <button
          className="card cardFull p-6 flex flex-col items-center justify-center hover:shadow-md transition-shadow tooltip"
          onClick={() => onNavigate('products')}
          data-testid="operator_btn_catalog_en"
          data-tooltip={t('dashboardOperator.catalogTooltip')}
        >
          <div className="text-4xl mb-4">📦</div>
          <div className="font-bold text-lg">{t('dashboardOperator.productCatalog')}</div>
          <div className="text-muted mt-2">{t('dashboardOperator.viewUpdateStock')}</div>
        </button>
      </div>

      {/* Current Shift Stats - Focus on today's performance */}
      {data?.operational && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="operator_widget_shift_stats_en">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardOperator.salesPerDay')}</span>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold">{data.operational.total_transactions}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardOperator.revenue')}</span>
              <span className="text-2xl">💵</span>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(data.operational.total_revenue)}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardOperator.pointsAccrued')}</span>
              <span className="text-2xl text-green-500">📈</span>
            </div>
            <div className="text-3xl font-bold">{data.operational.total_transactions * 36}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardOperator.pointsWrittenOff')}</span>
              <span className="text-2xl text-orange-500">📉</span>
            </div>
            <div className="text-3xl font-bold">0</div>
          </div>
        </div>
      )}

      {/* Empty State if No Data */}
      {(!data?.operational || data.operational.total_transactions === 0) && (
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
