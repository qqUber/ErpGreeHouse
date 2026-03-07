import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dashboard } from '../../api';

interface ManagerDashboardProps {
  data?: {
    operational?: any;
    customers?: any;
    products?: any;
    marketing?: any;
    integrations?: any;
  } | null;
  onNavigate: (tab: string, params?: Record<string, string | number>) => void;
}

export function ManagerDashboard({ data, onNavigate }: ManagerDashboardProps) {
  const { t } = useTranslation();
  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  };

  return (
    <div className="space-y-6" data-testid="manager_dashboard_en">
      {/* KPI Cards - Focus on business performance */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6" data-testid="manager_widget_kpi_en">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardManager.totalCustomers')}</span>
              <span className="text-2xl text-blue-500">👥</span>
            </div>
            <div className="text-3xl font-bold">{data.customers?.total_customers || 0}</div>
            <div className="text-green-500 text-sm mt-2">{t('dashboardManager.todayGrowth', { count: 5 })}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardManager.averageCheck')}</span>
              <span className="text-2xl text-purple-500">💳</span>
            </div>
            <div className="text-3xl font-bold">
              {data.operational?.total_transactions > 0 ? formatCurrency(data.operational?.total_revenue / data.operational?.total_transactions) : '—'}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardManager.netBalance')}</span>
              <span className="text-2xl text-green-500">📊</span>
            </div>
            <div className="text-3xl font-bold">{data.operational?.total_transactions || 0 * 36}</div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">{t('dashboardManager.loyaltyPercent')}</span>
              <span className="text-2xl text-orange-500">❤️</span>
            </div>
            <div className="text-3xl font-bold">
              {data.operational?.total_transactions > 0 ? Math.round((data.operational?.total_transactions / data.operational?.total_transactions) * 100) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Marketing & Campaign Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-4 gap-6">
        {/* Active Campaigns */}
        <div className="card cardFull" data-testid="manager_widget_active_campaigns_en">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">{t('dashboardManager.activeCampaigns')}</div>
            <button 
              className="btn btnPrimary"
              onClick={() => onNavigate('marketing')}
              data-testid="manager_btn_manage_campaigns_en"
            >
              {t('dashboardManager.manage')}
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
                    <div className="font-semibold">{t('dashboardManager.campaign', { number: campaign })}</div>
                    <div className="text-muted text-sm">{t('dashboardManager.activeDays', { days: 2 })}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">+12%</div>
                  <div className="text-muted text-sm">{t('dashboardManager.clients')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Marketing Events */}
        <div className="card cardFull" data-testid="manager_widget_recent_events_en">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">{t('dashboardManager.recentEvents')}</div>
            <button 
              className="btn"
              onClick={() => onNavigate('marketing')}
              data-testid="manager_btn_view_all_events_en"
            >
              {t('dashboardManager.viewAll')}
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
                    <div className="text-muted text-sm">{t('dashboardManager.sentAt')} • 10:30</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{50 + event * 20}</div>
                  <div className="text-muted text-sm">{t('dashboardManager.messages')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Trend & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-4 gap-6">
        {/* Sales Trend Chart Placeholder */}
        <div className="card cardFull" data-testid="manager_widget_sales_trend_en">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">{t('dashboardManager.salesTrend')}</div>
            <button 
              className="btn"
              onClick={() => onNavigate('analytics')}
              data-testid="manager_btn_analytics_en"
            >
              {t('dashboardManager.analytics')}
            </button>
          </div>
          
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-muted">{t('dashboardManager.salesChart')}</div>
          </div>
        </div>

        {/* Top Products */}
        <div className="card cardFull" data-testid="manager_widget_top_products_en">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">{t('dashboardManager.topProducts')}</div>
            <button 
              className="btn"
              onClick={() => onNavigate('products')}
              data-testid="manager_btn_catalog_en"
            >
              {t('dashboardManager.catalog')}
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
                    <div className="font-semibold">{t('dashboardManager.product', { number: product })}</div>
                    <div className="text-muted text-sm">{t('dashboardManager.categoryPrice')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{100 + product * 50}</div>
                  <div className="text-muted text-sm">{t('dashboardManager.sales')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integrations Status */}
      <div className="card cardFull" data-testid="manager_widget_integrations_en">
        <div className="flex items-center justify-between mb-6">
          <div className="font-bold text-lg">{t('dashboardManager.integrations')}</div>
          <div className="flex gap-2">
            <span className="pill pillGood">Telegram ✓</span>
            <span className="pill pillGood">VK ✓</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="font-semibold mb-2">{t('dashboardManager.telegramBot')}</div>
            <div className="text-muted text-sm">{t('dashboardManager.published')} • {t('dashboardManager.subscribers', { count: 500 })}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="font-semibold mb-2">{t('dashboardManager.vkCommunity')}</div>
            <div className="text-muted text-sm">{t('dashboardManager.active')} • {t('dashboardManager.subscribers', { count: 300 })}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
