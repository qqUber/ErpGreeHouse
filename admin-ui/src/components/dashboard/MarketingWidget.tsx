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
  const attentionLabel = t('widgets.common.attention', 'Need attention');
  const hasMarketingSignal = activeCampaigns > 0 || newWeek > 0 || messagesSent > 0 || openRate > 0;

  const renderMetric = (label: string, value: React.ReactNode, helper?: string, tone: 'primary' | 'success' | 'warning' | 'info' = 'primary') => (
    <StatCard value={value as any} label={label} variant={tone} className={`stat-card-gradient stat-card-gradient-${tone}`} />
  );

  const compactContent = (
    <StatCard variant="primary" value={activeCampaigns.toLocaleString()} label={t('widgets.marketing.activeCampaigns')} className="stat-card-gradient stat-card-gradient-primary" />
  );

  const expandedContent = (
    <div className="crm-drawer-stack">
      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">{t('widgets.marketing.details', 'Campaign details')}</h3>
        <div className="crm-list">
          <div className="crm-customer-row">
            <div className="crm-customer-main">
              <span className="crm-customer-name">{t('widgets.marketing.activeCampaigns')}</span>
            </div>
            <div className="crm-customer-badges">
              <span className="crm-badge crm-badge-value">{activeCampaigns.toLocaleString()}</span>
              <span className="crm-badge crm-badge-muted">{activeCampaigns > 0 ? 'Live only' : 'No active campaigns'}</span>
            </div>
          </div>
          <div className="crm-customer-row">
            <div className="crm-customer-main">
              <span className="crm-customer-name">{attentionLabel}</span>
            </div>
            <div className="crm-customer-badges">
              <span className="crm-badge crm-badge-warn">{newWeek.toLocaleString()}</span>
              <span className="crm-badge crm-badge-muted">{newWeek > 0 ? 'Needs review' : 'No items need attention'}</span>
            </div>
          </div>
          <div className="crm-customer-row">
            <div className="crm-customer-main">
              <span className="crm-customer-name">{t('widgets.marketing.messagesSent')}</span>
            </div>
            <div className="crm-customer-badges">
              <span className="crm-badge crm-badge-value">{messagesSent.toLocaleString()}</span>
              <span className="crm-badge crm-badge-muted">{messagesSent > 0 ? 'Last 24h' : 'No messages sent'}</span>
            </div>
          </div>
          <div className="crm-customer-row">
            <div className="crm-customer-main">
              <span className="crm-customer-name">{t('widgets.marketing.openRate')}</span>
            </div>
            <div className="crm-customer-badges">
              <span className="crm-badge crm-badge-good">{openRate > 0 ? `${openRate}%` : '—'}</span>
              <span className="crm-badge crm-badge-muted">{openRate > 0 ? 'Open rate' : 'No open rate'}</span>
            </div>
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
    />
  );
}
