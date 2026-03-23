import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../ui/StatCard';
import { Widget } from '../Widget';

type MarketingData = {
  active_campaigns?: number;
  trigger_stats_24h?: Record<string, number>;
  upcoming_campaigns?: Array<any>;
};

export function MarketingWidget({ data }: { data?: any }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const marketingEvents = data?.recentEvents || [];
  const activeCampaigns = Number(data?.activeCampaigns ?? 0);
  const newWeek = Number(data?.needsAttention ?? 0);
  const messagesSent = Number(data?.messagesSent24h ?? 0);
  const campaigns = data?.campaigns || {};
  const openRate = Number(data?.openRate ?? campaigns?.open_rate ?? 0);

  const compactContent = (
    <StatCard
      variant="primary"
      value={activeCampaigns}
      label={t('widgets.marketing.activeCampaigns')}
    />
  );

  const expandedContent = (
    <div className="crm-drawer-stack">
      <section className="crm-detail-card">
        <div className="crm-detail-grid">
          <div>
            <span>{t('widgets.marketing.activeCampaigns')}</span>
            <strong>{activeCampaigns}</strong>
          </div>
          <div>
            <span>{t('widgets.common.attention', 'Needs attention')}</span>
            <strong>{newWeek}</strong>
          </div>
          <div>
            <span>{t('widgets.marketing.messagesSent')}</span>
            <strong>{messagesSent}</strong>
          </div>
          <div>
            <span>{t('widgets.marketing.openRate')}</span>
            <strong>{openRate > 0 ? `${openRate}%` : '—'}</strong>
          </div>
        </div>
      </section>
      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">Recent marketing events</h3>
        <div className="crm-list">
          {marketingEvents.length ? (
            marketingEvents.slice(0, 6).map((event: any, index: number) => (
              <div
                key={`${event.id ?? event.trigger_name ?? 'event'}-${index}`}
                className="crm-customer-row"
              >
                <div className="crm-customer-main">
                  <span className="crm-customer-name">
                    {event.trigger_name ?? 'Campaign event'}
                  </span>
                  <span className="crm-customer-id">
                    {event.customer_name ?? 'Customer not specified'}
                  </span>
                </div>
                <div className="crm-customer-badges">
                  <span className="crm-badge crm-badge-channel">{event.status ?? 'pending'}</span>
                  <span className="crm-badge crm-badge-value">
                    {event.created_at ? new Date(event.created_at).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="crm-empty-state">No recent marketing events available.</div>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <Widget
      title={t('widgets.marketing.title')}
      isExpanded={isExpanded}
      onExpand={() => setIsExpanded(true)}
      onCollapse={() => setIsExpanded(false)}
      compactContent={compactContent}
      expandedContent={expandedContent}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.marketing.activeCampaigns')}</span>
          <span className="text-lg font-semibold">{activeCampaigns}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.common.newThisWeek')}</span>
          <span className="text-lg font-semibold">{newWeek}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.marketing.messagesSent')}</span>
          <span className="text-lg font-semibold">{messagesSent}</span>
        </div>
        <StatCard variant="success" value={openRate > 0 ? `${openRate}%` : '—'} label={t('widgets.marketing.openRate')} />
      </div>
    </Widget>
  );
}
