import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../ui/StatCard';
import { Widget } from '../Widget';

type IntegrationsData = {
  integrations?: Array<{ name?: string; status?: string }>;
  pending_count?: number;
  recent_deliveries?: Array<{ created_at?: string }>;
};

export function IntegrationsWidget({ data }: { data?: any }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const integrations = data?.integrations ?? [];
  const uniqueIntegrations = integrations.filter(
    (integration: any, index: number, array: any[]) => {
      const key = `${integration.kind ?? 'kind'}-${integration.name ?? 'name'}-${integration.status ?? 'status'}`;
      return (
        array.findIndex(
          (candidate: any) =>
            `${candidate.kind ?? 'kind'}-${candidate.name ?? 'name'}-${candidate.status ?? 'status'}` ===
            key
        ) === index
      );
    }
  );
  const total = integrations.length;
  const active = uniqueIntegrations.filter(
    (integration: any) => integration.status === 'online'
  ).length;
  const pendingCount = Number(data?.pendingCount ?? 0);
  const lastDelivery = data?.recentDeliveries?.[0]?.created_at;
  const lastSync = lastDelivery
    ? new Date(lastDelivery).toLocaleString()
    : t('widgets.integrations.twoMinutesAgo');
  const allConnected = pendingCount === 0;

  const renderSummaryMetric = (
    label: string,
    value: React.ReactNode,
    helper?: string,
    tone: 'primary' | 'success' | 'warning' | 'info' = 'primary'
  ) => (
    <div className={`crm-summary-card crm-detail-card--accent-${tone}`}>
      <div className="crm-summary-label">{label}</div>
      <div className="crm-summary-value">{value}</div>
      {helper ? <div className="crm-summary-helper">{helper}</div> : null}
    </div>
  );

  const compactContent = (
    <StatCard
      variant="warning"
      value={total}
      label={t('widgets.integrations.activeIntegrations')}
    />
  );

  const expandedContent = (
    <div className="crm-drawer-stack">
      <section className="crm-detail-card crm-detail-card--accent-warning">
        <div className="crm-summary-grid">
          {renderSummaryMetric(
            t('widgets.integrations.totalIntegrations'),
            total,
            total > 0 ? 'Configured connectors' : 'No integrations configured',
            'primary'
          )}
          {renderSummaryMetric(
            t('widgets.common.active'),
            active,
            active > 0 ? 'Online now' : 'No active integrations',
            'success'
          )}
          {renderSummaryMetric(
            t('widgets.common.pending', 'Pending'),
            pendingCount,
            allConnected ? 'All connected' : 'Pending deliveries exist',
            'warning'
          )}
          {renderSummaryMetric(
            t('widgets.integrations.lastSync'),
            lastSync,
            allConnected ? 'All connected' : 'Pending deliveries exist',
            'info'
          )}
        </div>
      </section>
      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">Integration status</h3>
        <div className="crm-list">
          {uniqueIntegrations.length ? (
            uniqueIntegrations.map((integration: any, index: number) => (
              <div
                key={`${integration.kind}-${integration.name}-${index}`}
                className="crm-customer-row"
              >
                <div className="crm-customer-main">
                  <span className="crm-customer-name">
                    {integration.name || integration.kind || 'Integration'}
                  </span>
                </div>
                <div className="crm-customer-badges">
                  <span
                    className={`crm-badge ${integration.status === 'online' ? 'crm-badge-good' : 'crm-badge-warn'}`}
                  >
                    {integration.status || 'unknown'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="crm-empty-state">No integrations configured.</div>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <Widget
      title={t('widgets.integrations.title')}
      isExpanded={isExpanded}
      onExpand={() => setIsExpanded(true)}
      onCollapse={() => setIsExpanded(false)}
      compactContent={compactContent}
      expandedContent={expandedContent}
    />
  );
}
