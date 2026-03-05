import React from 'react';

interface Integration {
  name: string;
  kind: string;
  status: string;
}

interface IntegrationDelivery {
  id: number;
  event_type: string;
  status: string;
  http_status?: number;
  created_at: string;
}

interface IntegrationsWidgetProps {
  integrations: Integration[];
  recentDeliveries: IntegrationDelivery[];
  deliveryStats: Record<string, number>;
  successRate: number;
  pendingCount: number;
  lastSyncs: Record<string, any>;
}

export const IntegrationsWidget: React.FC<IntegrationsWidgetProps> = ({
  integrations,
  recentDeliveries,
  deliveryStats,
  successRate,
  pendingCount,
  lastSyncs,
}) => {
  const getIntegrationIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'telegram':
        return '💬';
      case 'vk':
        return '🔗';
      case 'erp':
        return '📊';
      default:
        return '🔌';
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return {
          background: 'rgba(4, 120, 87, 0.06)',
          color: 'var(--good)',
          border: '1px solid rgba(4, 120, 87, 0.25)'
        };
      case 'failed':
        return {
          background: 'rgba(185, 28, 28, 0.06)',
          color: 'var(--bad)',
          border: '1px solid rgba(185, 28, 28, 0.25)'
        };
      case 'pending':
        return {
          background: 'rgba(180, 83, 9, 0.06)',
          color: 'var(--warn)',
          border: '1px solid rgba(180, 83, 9, 0.25)'
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
        <div style={{ fontWeight: 800, fontSize: 16 }}>Интеграции</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            Успешность: {successRate.toFixed(1)}%
          </span>
          {pendingCount > 0 && (
            <span className="pill pillWarn" style={{ fontSize: 11 }}>
              {pendingCount} в очереди
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {/* Integration Status Grid */}
        {integrations.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 8 
            }}>
              Статус интеграций
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {integrations.map((integration, index) => (
                <div
                  key={index}
                  className="card"
                  style={{ 
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.5)'
                  }}
                >
                  <div className="row">
                    <div style={{ fontSize: 24 }}>{getIntegrationIcon(integration.kind)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {integration.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{integration.kind}</div>
                    </div>
                    <div>
                      <span
                        style={{
                          ...(integration.status === 'online' ? {
                            background: 'rgba(4, 120, 87, 0.06)',
                            color: 'var(--good)',
                            border: '1px solid rgba(4, 120, 87, 0.25)'
                          } : {
                            background: 'rgba(185, 28, 28, 0.06)',
                            color: 'var(--bad)',
                            border: '1px solid rgba(185, 28, 28, 0.25)'
                          }),
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: 11,
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        {integration.status === 'online' ? 'Онлайн' : 'Оффлайн'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Deliveries */}
        {recentDeliveries.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 8 
            }}>
              Последние события
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {recentDeliveries.slice(0, 5).map((delivery) => (
                <div
                  key={delivery.id}
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
                      {delivery.event_type}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {formatTime(delivery.created_at)}
                      {delivery.http_status && ` · HTTP ${delivery.http_status}`}
                    </div>
                  </div>
                  <div style={{ marginLeft: 12 }}>
                    <span
                      style={{
                        ...getDeliveryStatusColor(delivery.status),
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: 11,
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      {delivery.status === 'success' ? 'Успех' : 
                       delivery.status === 'pending' ? 'В очереди' : 'Ошибка'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivery Stats */}
        {Object.keys(deliveryStats).length > 0 && (
          <div>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 8 
            }}>
              Статистика за 24ч
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {deliveryStats.success > 0 && (
                <div className="pill pillGood" style={{ fontSize: 11 }}>
                  Успех: {deliveryStats.success}
                </div>
              )}
              {deliveryStats.failed > 0 && (
                <div className="pill pillBad" style={{ fontSize: 11 }}>
                  Ошибки: {deliveryStats.failed}
                </div>
              )}
              {deliveryStats.pending > 0 && (
                <div className="pill pillWarn" style={{ fontSize: 11 }}>
                  В очереди: {deliveryStats.pending}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Syncs */}
        {Object.keys(lastSyncs).length > 0 && (
          <div>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: 'var(--text)', 
              marginBottom: 8 
            }}>
              Последние синхронизации
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(lastSyncs).map(([integration, syncData]) => (
                <div
                  key={integration}
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
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{integration}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(syncData).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {integrations.length === 0 && recentDeliveries.length === 0 && Object.keys(deliveryStats).length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)', fontSize: 13 }}>
            Интеграции не настроены
          </div>
        )}
      </div>
    </div>
  );
};
