import React from 'react';

interface TriggerEvent {
  id: number;
  trigger_name: string;
  customer_name: string;
  status: string;
  created_at: string;
}

interface MarketingWidgetProps {
  activeCampaigns: number;
  recentTriggerEvents: TriggerEvent[];
  triggerStats: Record<string, number>;
  campaignPerformance: any[];
  upcomingCampaigns: any[];
}

export const MarketingWidget: React.FC<MarketingWidgetProps> = ({
  activeCampaigns,
  recentTriggerEvents,
  triggerStats,
  campaignPerformance,
  upcomingCampaigns,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMinutes < 60) {
      return `${diffMinutes} мин назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч назад`;
    } else {
      return date.toLocaleDateString('ru-RU');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Маркетинговые события</h3>
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
          {activeCampaigns} активных кампаний
        </span>
      </div>

      <div className="space-y-4">
        {/* Recent Trigger Events */}
        {recentTriggerEvents.length > 0 && (
          <>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Последние события</h4>
            <div className="space-y-2">
              {recentTriggerEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {event.trigger_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {event.customer_name} · {formatTime(event.created_at)}
                    </div>
                  </div>
                  <div className="ml-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}
                    >
                      {event.status === 'processed' ? 'Успешно' : 
                       event.status === 'pending' ? 'В ожидании' : 'Ошибка'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Trigger Stats */}
        {Object.keys(triggerStats).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">События за 24ч</h4>
            <div className="flex space-x-2">
              {triggerStats.processed > 0 && (
                <div className="bg-green-50 px-2 py-1 rounded text-xs text-green-700">
                  Успешно: {triggerStats.processed}
                </div>
              )}
              {triggerStats.pending > 0 && (
                <div className="bg-yellow-50 px-2 py-1 rounded text-xs text-yellow-700">
                  В ожидании: {triggerStats.pending}
                </div>
              )}
              {triggerStats.failed > 0 && (
                <div className="bg-red-50 px-2 py-1 rounded text-xs text-red-700">
                  Ошибки: {triggerStats.failed}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Campaigns */}
        {upcomingCampaigns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Предстоящие кампании</h4>
            <div className="space-y-2">
              {upcomingCampaigns.slice(0, 3).map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <div className="text-sm text-gray-900">{campaign.name}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(campaign.scheduled_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentTriggerEvents.length === 0 && Object.keys(triggerStats).length === 0 && upcomingCampaigns.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">Нет недавних маркетинговых событий</div>
          </div>
        )}
      </div>
    </div>
  );
};
