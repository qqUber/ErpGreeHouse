import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';

type MarketingData = {
  active_campaigns?: number;
  trigger_stats_24h?: Record<string, number>;
  upcoming_campaigns?: Array<any>;
};

export function MarketingWidget({ data }: { data?: MarketingData }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const activeCampaigns = Number(data?.active_campaigns ?? 0);
  const newWeek = Number(data?.upcoming_campaigns?.length ?? 0);
  const messagesSent = Object.values(data?.trigger_stats_24h || {}).reduce(
    (acc, n) => acc + Number(n || 0),
    0
  );

  const compactContent = (
    <div className="text-center">
      <div className="text-3xl font-bold text-pink-600">{activeCampaigns}</div>
      <div className="text-sm text-gray-500">{t('widgets.marketing.activeCampaigns')}</div>
      <div className="text-sm text-gray-500 mt-1">
        {t('widgets.marketing.plusNew', { count: newWeek })}
      </div>
    </div>
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
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.marketing.openRate')}</span>
          <span className="text-lg font-semibold text-green-600">87%</span>
        </div>
      </div>
    </Widget>
  );
}
