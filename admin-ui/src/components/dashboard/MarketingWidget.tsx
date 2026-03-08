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
          background: 'var(--good-light)',
          color: 'var(--good)',
          border: '1px solid rgba(4, 120, 87, 0.25)',
        };
      case 'pending':
        return {
          background: 'var(--warn-light)',
          color: 'var(--warn)',
          border: '1px solid rgba(180, 83, 9, 0.25)',
        };
      case 'failed':
        return {
          background: 'var(--bad-light)',
          color: 'var(--bad)',
          border: '1px solid rgba(185, 28, 28, 0.25)',
        };
      default:
        return {
          background: 'var(--brand-light)',
          color: 'var(--muted)',
          border: '1px solid rgba(107, 114, 128, 0.25)',
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
    <div
      className="card cardFull"
      data-testid="admin_widget_marketing_en"
      role="region"
      aria-label="Marketing Events"
    >
      <div className="row mb-4">
        <div
          style={{
            fontWeight: 'var(--font-weight-extrabold)',
            fontSize: 'var(--font-size-xl)',
          }}
        >
          Маркетинговые события
        </div>
        <span className="pill pillGood">{activeCampaigns} активных кампаний</span>
      </div>

      <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
        {/* Recent Trigger Events */}
        {recentTriggerEvents.length > 0 && (
          <>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text)',
                marginBottom: 'var(--spacing-sm)',
              }}
            >
              Последние события
            </div>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              {recentTriggerEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="row"
                  style={{
                    padding: 'var(--spacing-sm)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-light)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-light)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--brand-light)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--text)',
                      }}
                    >
                      {event.trigger_name}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--muted)',
                      }}
                    >
                      {event.customer_name} · {formatTime(event.created_at)}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'var(--spacing-sm)' }}>
                    <span
                      style={{
                        ...getStatusColor(event.status),
                        padding: '0.125rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      {event.status === 'processed'
                        ? 'Успешно'
                        : event.status === 'pending'
                          ? 'В ожидании'
                          : 'Ошибка'}
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
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text)',
                marginBottom: 'var(--spacing-sm)',
              }}
            >
              События за 24ч
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              {triggerStats.processed > 0 && (
                <div className="pill pillGood">Успешно: {triggerStats.processed}</div>
              )}
              {triggerStats.pending > 0 && (
                <div className="pill pillWarn">В ожидании: {triggerStats.pending}</div>
              )}
              {triggerStats.failed > 0 && (
                <div className="pill pillBad">Ошибки: {triggerStats.failed}</div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Campaigns */}
        {upcomingCampaigns.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text)',
                marginBottom: 'var(--spacing-sm)',
              }}
            >
              Предстоящие кампании
            </div>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              {upcomingCampaigns.slice(0, 3).map((campaign) => (
                <div
                  key={campaign.id}
                  className="row"
                  style={{
                    padding: 'var(--spacing-sm)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-light)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-light)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--brand-light)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text)' }}>
                    {campaign.name}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>
                    {new Date(campaign.scheduled_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recentTriggerEvents.length === 0 &&
          Object.keys(triggerStats).length === 0 &&
          upcomingCampaigns.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--spacing-xl) var(--spacing-lg)',
                color: 'var(--muted)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              Нет недавних маркетинговых событий
            </div>
          )}
      </div>
    </div>
  );
};
