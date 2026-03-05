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
        return {
          background: 'rgba(4, 120, 87, 0.06)',
          color: 'var(--good)',
          border: '1px solid rgba(4, 120, 87, 0.25)'
        };
      case 'pending':
        return {
          background: 'rgba(180, 83, 9, 0.06)',
          color: 'var(--warn)',
          border: '1px solid rgba(180, 83, 9, 0.25)'
        };
      case 'failed':
        return {
          background: 'rgba(185, 28, 28, 0.06)',
          color: 'var(--bad)',
          border: '1px solid rgba(185, 28, 28, 0.25)'
        };
      default:
        return {
          background: 'rgba(107, 114, 128, 0.06)',
          color: 'var(--muted)',
          border: '1px solid rgba(107, 114, 128, 0.25)'
        };
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
    <div className="card cardFull">
      <div className="row mb-4">
        <div style={{ fontWeight: 800, fontSize: 16 }}>Маркетинговые события</div>
        <span className="pill pillGood" style={{ fontSize: 12 }}>
          {activeCampaigns} активных кампаний
        </span>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {/* Recent Trigger Events */}
        {recentTriggerEvents.length > 0 && (
          <>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 8 
            }}>
              Последние события
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {recentTriggerEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="row"
                  style={{ 
                    padding: 8, 
                    borderRadius: 8, 
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {event.trigger_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {event.customer_name} · {formatTime(event.created_at)}
                    </div>
                  </div>
                  <div style={{ marginLeft: 12 }}>
                    <span
                      style={{
                        ...getStatusColor(event.status),
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: 11,
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
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
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 8 
            }}>
              События за 24ч
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {triggerStats.processed > 0 && (
                <div className="pill pillGood" style={{ fontSize: 11 }}>
                  Успешно: {triggerStats.processed}
                </div>
              )}
              {triggerStats.pending > 0 && (
                <div className="pill pillWarn" style={{ fontSize: 11 }}>
                  В ожидании: {triggerStats.pending}
                </div>
              )}
              {triggerStats.failed > 0 && (
                <div className="pill pillBad" style={{ fontSize: 11 }}>
                  Ошибки: {triggerStats.failed}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Campaigns */}
        {upcomingCampaigns.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 8 
            }}>
              Предстоящие кампании
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {upcomingCampaigns.slice(0, 3).map((campaign) => (
                <div
                  key={campaign.id}
                  className="row"
                  style={{ 
                    padding: 8, 
                    borderRadius: 8, 
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(0, 0, 0, 0.03)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{campaign.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(campaign.scheduled_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentTriggerEvents.length === 0 && Object.keys(triggerStats).length === 0 && upcomingCampaigns.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)', fontSize: 13 }}>
            Нет недавних маркетинговых событий
          </div>
        )}
      </div>
    </div>
  );
};
