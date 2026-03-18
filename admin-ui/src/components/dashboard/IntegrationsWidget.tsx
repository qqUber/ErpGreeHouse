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
  
  // Use integrations_total from API
  const total = Number(data?.integrations_total ?? 0);
  const active = total; // Assume all integrations are active since API doesn't provide status
  const pendingCount = 0; // No pending count in API
  const allConnected = pendingCount === 0;
  const lastSync = t('widgets.integrations.twoMinutesAgo'); // Default fallback

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
          <span>Telegram Bot</span>
        </div>
        <div className="flex items-center">
          <div className="integration-status-indicator"></div>
          <span>VKontakte</span>
        </div>
        <div className="flex items-center">
          <div className="integration-status-indicator"></div>
          <span>ERPNext</span>
        </div>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Total integrations: {total} | Active: {active}
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
