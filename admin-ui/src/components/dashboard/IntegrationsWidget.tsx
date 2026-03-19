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
  const total = integrations.length;
  const active = integrations.filter((integration: any) => integration.status === 'online').length;
  const pendingCount = Number(data?.pendingCount ?? 0);
  const lastDelivery = data?.recentDeliveries?.[0]?.created_at;
  const lastSync = lastDelivery
    ? new Date(lastDelivery).toLocaleString()
    : t('widgets.integrations.twoMinutesAgo');
  const allConnected = pendingCount === 0;

  const compactContent = (
    <StatCard
      variant="warning"
      value={total}
      label={t('widgets.integrations.activeIntegrations')}
    />
  );

  const expandedContent = (
    <div className="crm-drawer-stack">
      <section className="crm-detail-card">
        <div className="crm-detail-grid">
          <div>
            <span>{t('widgets.integrations.totalIntegrations')}</span>
            <strong>{total}</strong>
          </div>
          <div>
            <span>{t('widgets.common.active')}</span>
            <strong>{active}</strong>
          </div>
          <div>
            <span>{t('widgets.common.pending', 'Pending')}</span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span>{t('widgets.integrations.lastSync')}</span>
            <strong>{lastSync}</strong>
          </div>
        </div>
      </section>
      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">Integration status</h3>
        <div className="crm-list">
          {integrations.length ? (
            integrations.map((integration: any, index: number) => (
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
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {t('widgets.integrations.totalIntegrations')}
          </span>
          <span className="text-lg font-semibold">{total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.common.active')}</span>
          <span className="text-lg font-semibold">{active}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.integrations.lastSync')}</span>
          <span className="text-lg font-semibold">{lastSync}</span>
        </div>
      </div>
    </Widget>
  );
}
