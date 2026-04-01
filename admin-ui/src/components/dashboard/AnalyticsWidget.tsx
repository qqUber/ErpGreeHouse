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

  // Helper to safely convert to number, defaulting on NaN
  const safeNumber = (value: any, defaultValue = 0): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : defaultValue;
  };

  const customers = data?.customers || {};
  const campaigns = data?.campaigns || {};
  const totalCustomers = safeNumber(customers.total_customers, 0);
  const consented = safeNumber(customers.marketing_consent, 0);
  const telegram = safeNumber(customers.channels?.telegram, 0);
  const vk = safeNumber(customers.channels?.vk, 0);
  const reachable = Math.min(totalCustomers, telegram + vk);
  const reachableCoverage = totalCustomers > 0 ? Math.round((reachable / totalCustomers) * 100) : 0;
  const consentRate = totalCustomers > 0 ? Math.round((consented / totalCustomers) * 100) : 0;
  const avgLTV = safeNumber(customers.avg_ltv, 0);
  const activeCampaigns = safeNumber(campaigns.active_campaigns, 0);
  const segments = customers.segments || {};
  const highValueCount = safeNumber(segments.high_value, 0);
  const highValueShare =
    totalCustomers > 0 ? Math.round((highValueCount / totalCustomers) * 100) : 0;

  return (
    <Widget title={t('analytics.title')} compactable={false}>
      <div className="dashboard-widget-2026 animate-fade-in-up">
        <div className="kpi-grid-2026 mb-6">
          <div className="stat-card-2026 stat-card-2026-success">
            <div className="stat-card-content">
              <div
                className="kpi-value-2026"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {consentRate}%
              </div>
              <div className="kpi-label-2026">{t('analytics.consentRate')}</div>
            </div>
          </div>
          <div className="stat-card-2026 stat-card-2026-primary">
            <div className="stat-card-content">
              <div className="kpi-value-2026">{reachableCoverage}%</div>
              <div className="kpi-label-2026">Reachable coverage</div>
            </div>
          </div>
          <div className="stat-card-2026 stat-card-2026-warning">
            <div className="stat-card-content">
              <div
                className="kpi-value-2026"
                style={{
                  background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {activeCampaigns}
              </div>
              <div className="kpi-label-2026">{t('analytics.activeCampaigns')}</div>
            </div>
          </div>
          <div className="stat-card-2026 stat-card-2026-info">
            <div className="stat-card-content">
              <div
                className="kpi-value-2026"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {highValueShare}%
              </div>
              <div className="kpi-label-2026">High-value share</div>
            </div>
          </div>
        </div>

        <section className="mb-6">
          <h4 className="section-title-2026">Channel coverage</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium w-20">Telegram</span>
              <div className="progress-track-2026 flex-1">
                <div
                  className="progress-fill-2026"
                  style={{
                    width: `${totalCustomers > 0 ? Math.round((telegram / totalCustomers) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="badge-2026 badge-2026-primary">{telegram}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium w-20">VK</span>
              <div className="progress-track-2026 flex-1">
                <div
                  className="progress-fill-2026"
                  style={{
                    width: `${totalCustomers > 0 ? Math.round((vk / totalCustomers) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="badge-2026 badge-2026-primary">{vk}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium w-20">Consented</span>
              <div className="progress-track-2026 flex-1">
                <div className="progress-fill-2026" style={{ width: `${consentRate}%` }} />
              </div>
              <span className="badge-2026 badge-2026-success">{consented}</span>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <h4 className="section-title-2026">Campaign activity</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="kpi-card-2026">
              <div className="text-2xl font-bold text-gray-800">{activeCampaigns}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Active</div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-2xl font-bold text-gray-800">
                {Number(campaigns.upcoming_campaigns || 0)}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Upcoming</div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-2xl font-bold text-gray-800">
                {Number(campaigns.messages_sent_24h || 0)}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Messages/24h</div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-2xl font-bold text-gray-800">
                {Number(campaigns.open_rate || 0)}%
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Open Rate</div>
            </div>
          </div>
        </section>

        <section>
          <h4 className="section-title-2026">Customer value segments</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="kpi-card-2026">
              <div className="text-2xl font-bold text-indigo-600">
                {Number(segments.high_value || 0)}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                {t('analytics.highValue')}
              </div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-2xl font-bold text-green-600">
                {Number(segments.active || 0)}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                {t('analytics.active')}
              </div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-2xl font-bold text-blue-600">
                {Number(segments.new_customers || 0)}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                {t('analytics.new')}
              </div>
            </div>
            <div className="kpi-card-2026">
              <div className="text-2xl font-bold text-purple-600">
                {avgLTV > 0 ? avgLTV.toLocaleString() : '—'}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                {t('analytics.avgLTV')}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Widget>
  );
}
