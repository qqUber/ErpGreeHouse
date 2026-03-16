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

  const customers = data?.customers || {};
  const campaigns = data?.campaigns || {};
  const totalCustomers = Number(customers.total_customers || 0);
  const consented = Number(customers.marketing_consent || 0);
  const telegram = Number(customers.channels?.telegram || 0);
  const vk = Number(customers.channels?.vk || 0);
  const reachable = Math.min(totalCustomers, telegram + vk);
  const reachableCoverage = totalCustomers > 0 ? Math.round((reachable / totalCustomers) * 100) : 0;
  const consentRate = totalCustomers > 0 ? Math.round((consented / totalCustomers) * 100) : 0;
  const avgLTV = customers.avg_ltv || 14567;
  const activeCampaigns = campaigns.active_campaigns || 3;
  const segments = customers.segments || {};
  const highValueCount = Number(segments.high_value || 0);
  const highValueShare = totalCustomers > 0 ? Math.round((highValueCount / totalCustomers) * 100) : 0;

  return (
    <Widget title={t('analytics.title')} compactable={false}>
      <div className="marketing-analytics-dashboard crm-analytics p-4">
        <div className="metrics-grid grid grid-cols-4 gap-3 mb-4">
          <div className="stat-card stat-card-success crm-kpi-tile">
            <div className="stat-card-content"><div className="stat-card-value">{consentRate}%</div><div className="stat-card-label">{t('analytics.consentRate')}</div></div>
          </div>
          <div className="stat-card stat-card-primary crm-kpi-tile">
            <div className="stat-card-content"><div className="stat-card-value">{reachableCoverage}%</div><div className="stat-card-label">Reachable coverage</div></div>
          </div>
          <div className="stat-card stat-card-warning crm-kpi-tile">
            <div className="stat-card-content"><div className="stat-card-value">{activeCampaigns}</div><div className="stat-card-label">{t('analytics.activeCampaigns')}</div></div>
          </div>
          <div className="stat-card stat-card-info crm-kpi-tile">
            <div className="stat-card-content"><div className="stat-card-value">{highValueShare}%</div><div className="stat-card-label">High-value share</div></div>
          </div>
        </div>

        <section className="crm-collapsible-section">
          <h4 className="crm-section-title">Channel coverage</h4>
          <div className="crm-coverage-grid">
            <div className="crm-coverage-row">
              <span>Telegram</span>
              <div className="crm-progress-track"><div className="crm-progress-fill" style={{ width: `${totalCustomers > 0 ? Math.round((telegram / totalCustomers) * 100) : 0}%` }} /></div>
              <strong>{telegram}</strong>
            </div>
            <div className="crm-coverage-row">
              <span>VK</span>
              <div className="crm-progress-track"><div className="crm-progress-fill" style={{ width: `${totalCustomers > 0 ? Math.round((vk / totalCustomers) * 100) : 0}%` }} /></div>
              <strong>{vk}</strong>
            </div>
            <div className="crm-coverage-row">
              <span>Consented</span>
              <div className="crm-progress-track"><div className="crm-progress-fill" style={{ width: `${consentRate}%` }} /></div>
              <strong>{consented}</strong>
            </div>
          </div>
        </section>

        <section className="crm-collapsible-section">
          <h4 className="crm-section-title">Campaign activity</h4>
          <div className="crm-inline-stats">
            <span>Active campaigns: <strong>{activeCampaigns}</strong></span>
            <span>Upcoming: <strong>{Number(campaigns.upcoming_campaigns || 0)}</strong></span>
            <span>Messages / 24h: <strong>{Number(campaigns.messages_sent_24h || 0)}</strong></span>
            <span>Open rate: <strong>{Number(campaigns.open_rate || 0)}%</strong></span>
          </div>
        </section>

        <section className="crm-collapsible-section">
          <h4 className="crm-section-title">Customer value segments</h4>
          <div className="crm-inline-stats">
            <span>{t('analytics.highValue')}: <strong>{Number(segments.high_value || 0)}</strong></span>
            <span>{t('analytics.active')}: <strong>{Number(segments.active || 0)}</strong></span>
            <span>{t('analytics.new')}: <strong>{Number(segments.new_customers || 0)}</strong></span>
            <span>{t('analytics.avgLTV')}: <strong>{avgLTV.toLocaleString()}</strong></span>
          </div>
        </section>
      </div>
    </Widget>
  );
}
