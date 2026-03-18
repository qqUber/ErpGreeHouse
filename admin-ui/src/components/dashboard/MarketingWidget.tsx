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
  
  // Use marketing events data from API
  const marketingEvents = data?.recent_activity?.marketing_events || [];
  const activeCampaigns = marketingEvents.filter((e: any) => e.status === 'processed').length;
  const newWeek = marketingEvents.filter((e: any) => e.status === 'pending').length;
  const messagesSent = marketingEvents.length; // Simple count

  const compactContent = (
    <StatCard
      variant="primary"
      value={activeCampaigns}
      label={t('widgets.marketing.activeCampaigns')}
    />
  );

  const expandedContent = (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('widgets.marketing.details')}</h3>
      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-500">{t('widgets.marketing.activeCampaigns')}</div>
          <div className="text-xl font-bold">{activeCampaigns}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('widgets.common.newThisWeek')}</div>
          <div className="text-xl font-bold">{newWeek}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('widgets.marketing.messagesSent')}</div>
          <div className="text-xl font-bold">{messagesSent}</div>
        </div>
      </div>
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
        <StatCard
          variant="success"
          value="87%"
          label={t('widgets.marketing.openRate')}
        />
      </div>
    </Widget>
  );
}
