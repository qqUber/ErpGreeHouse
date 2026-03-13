import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';

export type MarketingAnalyticsData = {
  customers?: {
    total_customers?: number;
    marketing_consent?: number;
    avg_ltv?: number;
    avg_balance?: number;
    segments?: {
      high_value?: number;
      active?: number;
      new_customers?: number;
    };
    channels?: {
      telegram?: number;
      vk?: number;
      mixed?: number;
    };
  };
  campaigns?: {
    active_campaigns?: number;
    upcoming_campaigns?: number;
    messages_sent_24h?: number;
    open_rate?: number;
    click_rate?: number;
  };
  performance?: {
    total_revenue?: number;
    avg_order_value?: number;
    purchase_frequency?: number;
    customer_retention?: number;
  };
};

export function AnalyticsWidget({ data }: { data?: MarketingAnalyticsData }) {
  const { t } = useTranslation();
  
  // Extract data with defaults
  const customers = data?.customers || {};
  const campaigns = data?.campaigns || {};
  const performance = data?.performance || {};
  
  const totalCustomers = customers.total_customers || 36;
  const consentRate = totalCustomers > 0 ? Math.round(((customers.marketing_consent || 25) / totalCustomers) * 100) : 69;
  const avgLTV = customers.avg_ltv || 14567;
  const avgBalance = customers.avg_balance || 1343;
  const activeCampaigns = campaigns.active_campaigns || 3;
  const openRate = campaigns.open_rate || 87;
  
  const segments = customers.segments || {};
  const channels = customers.channels || {};

  return (
    <Widget title={t('analytics.title')} compactable={false}>
      <div className="marketing-analytics-dashboard p-4">
        {/* Key Metrics Row - Using Custom Styled Cards */}
        <div className="metrics-grid grid grid-cols-3 gap-3 mb-4">
          <div className="stat-card stat-card-success">
            <div className="stat-card-content">
              <div className="stat-card-icon">☕</div>
              <div className="stat-card-value">{consentRate}%</div>
              <div className="stat-card-label">{t('analytics.consentRate')}</div>
            </div>
          </div>
          <div className="stat-card stat-card-primary">
            <div className="stat-card-content">
              <div className="stat-card-icon">💰</div>
              <div className="stat-card-value">{avgLTV.toLocaleString()}</div>
              <div className="stat-card-label">{t('analytics.avgLTV')}</div>
            </div>
          </div>
          <div className="stat-card stat-card-warning">
            <div className="stat-card-content">
              <div className="stat-card-icon">📊</div>
              <div className="stat-card-value">{activeCampaigns}</div>
              <div className="stat-card-label">{t('analytics.activeCampaigns')}</div>
            </div>
          </div>
        </div>
        
        {/* Customer Segments - Enhanced Styling */}
        <div className="segments-section mb-4">
          <h4 className="text-sm font-semibold mb-3 text-gray-700">{t('analytics.customerSegments')}</h4>
          <div className="space-y-3">
            <div className="segment-row flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">⭐ {t('analytics.highValue')}</span>
              <div className="flex items-center gap-2">
                <div className="segment-bar bg-gray-200 rounded-full h-2 w-20">
                  <div className="segment-fill bg-yellow-500 h-2 rounded-full transition-all duration-300" style={{width: '22%'}}></div>
                </div>
                <span className="text-sm font-semibold text-yellow-600">{segments.high_value || 8}</span>
              </div>
            </div>
            <div className="segment-row flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">🔄 {t('analytics.active')}</span>
              <div className="flex items-center gap-2">
                <div className="segment-bar bg-gray-200 rounded-full h-2 w-20">
                  <div className="segment-fill bg-green-500 h-2 rounded-full transition-all duration-300" style={{width: '33%'}}></div>
                </div>
                <span className="text-sm font-semibold text-green-600">{segments.active || 12}</span>
              </div>
            </div>
            <div className="segment-row flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">✨ {t('analytics.new')}</span>
              <div className="flex items-center gap-2">
                <div className="segment-bar bg-gray-200 rounded-full h-2 w-20">
                  <div className="segment-fill bg-blue-500 h-2 rounded-full transition-all duration-300" style={{width: '17%'}}></div>
                </div>
                <span className="text-sm font-semibold text-blue-600">{segments.new_customers || 6}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Channel Performance - Card Style */}
        <div className="channel-section mb-4">
          <h4 className="text-sm font-semibold mb-3 text-gray-700">{t('analytics.channelPerformance')}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="channel-card p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">📱 Telegram</span>
                <span className="text-sm font-bold text-green-600">92%</span>
              </div>
              <div className="text-xs text-green-500 mt-1">{t('analytics.engagement')}</div>
            </div>
            <div className="channel-card p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">💬 VK</span>
                <span className="text-sm font-bold text-blue-600">67%</span>
              </div>
              <div className="text-xs text-blue-500 mt-1">{t('analytics.engagement')}</div>
            </div>
          </div>
        </div>
        
        {/* Summary Stats - Enhanced */}
        <div className="summary-stats mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">{t('analytics.totalCustomers')}</div>
              <div className="text-lg font-bold text-gray-700">{totalCustomers}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">{t('analytics.avgBalance')}</div>
              <div className="text-lg font-bold text-gray-700">{avgBalance.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}
