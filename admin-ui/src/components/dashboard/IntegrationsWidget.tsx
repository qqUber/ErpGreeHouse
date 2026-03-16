import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../ui/StatCard';
import { Widget } from '../Widget';

type IntegrationsData = {
  integrations?: Array<{ name?: string; status?: string }>;
  pending_count?: number;
  recent_deliveries?: Array<{ created_at?: string }>;
};

export function IntegrationsWidget({ data }: { data?: IntegrationsData }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // NaN guards: ensure all numeric values are valid
  const integrations = data?.integrations || [];
  const total = Number.isFinite(integrations.length) ? integrations.length : 0;
  const active = integrations.filter((i) => {
    const status = String(i?.status || '').toLowerCase();
    return status === 'enabled' || status === 'active' || status === 'ok';
  }).length;
  const pendingCount = Number.isFinite(data?.pending_count) ? Number(data?.pending_count) : 0;
  const allConnected = pendingCount === 0;
  const lastSync = data?.recent_deliveries?.[0]?.created_at
    ? new Date(data.recent_deliveries[0].created_at).toLocaleTimeString()
    : t('widgets.integrations.twoMinutesAgo');

  const compactContent = (
    <StatCard
      variant="warning"
      value={total}
      label={t('widgets.integrations.activeIntegrations')}
    />
  );

  const expandedContent = (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('widgets.integrations.details')}</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <div className="integration-status-indicator"></div>
          <span>{integrations[0]?.name || 'Telegram Bot'}</span>
        </div>
        <div className="flex items-center">
          <div className="integration-status-indicator"></div>
          <span>{integrations[1]?.name || 'VKontakte'}</span>
        </div>
        <div className="flex items-center">
          <div className="integration-status-indicator"></div>
          <span>{integrations[2]?.name || 'ERPNext'}</span>
        </div>
        <div className="flex items-center">
          <div className="integration-status-indicator"></div>
          <span>{integrations[3]?.name || 'Google Sheets'}</span>
        </div>
        <div className="flex items-center">
          <div className="integration-status-indicator"></div>
          <span>{integrations[4]?.name || 'Slack'}</span>
        </div>
      </div>
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
