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
          background: 'var(--good-light)',
          color: 'var(--good)',
          border: '1px solid rgba(4, 120, 87, 0.25)'
        };
      case 'failed':
        return {
          background: 'var(--bad-light)',
          color: 'var(--bad)',
          border: '1px solid rgba(185, 28, 28, 0.25)'
        };
      case 'pending':
        return {
          background: 'var(--warn-light)',
          color: 'var(--warn)',
          border: '1px solid rgba(180, 83, 9, 0.25)'
        };
      default:
        return {
          background: 'var(--brand-light)',
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
    <div className="card cardFull" data-testid="admin_widget_integrations_en">
      <div className="row mb-4">
        <div style={{ 
          fontWeight: 'var(--font-weight-extrabold)', 
          fontSize: 'var(--font-size-xl)'
        }}>
          Интеграции
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span style={{ 
            fontSize: 'var(--font-size-sm)', 
            color: 'var(--muted)'
          }}>
            Успешность: {successRate.toFixed(1)}%
          </span>
          {pendingCount > 0 && (
            <span className="pill pillWarn">
              {pendingCount} в очереди
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
        {/* Integration Status Grid */}
        {integrations.length > 0 && (
          <div>
            <div style={{ 
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text)', 
              marginBottom: 'var(--spacing-sm)'
            }}>
              Статус интеграций
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {integrations.map((integration, index) => (
                <div
                  key={index}
                  className="card cardCompact"
                  style={{ 
                    background: 'var(--brand-light)'
                  }}
                >
                  <div className="row">
                    <div style={{ fontSize: '2rem' }}>{getIntegrationIcon(integration.kind)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: 'var(--font-size-sm)', 
                        fontWeight: 'var(--font-weight-semibold)', 
                        color: 'var(--text)'
                      }}>
                        {integration.name}
                      </div>
                      <div style={{ 
                        fontSize: 'var(--font-size-xs)', 
                        color: 'var(--muted)'
                      }}>
                        {integration.kind}
                      </div>
                    </div>
                    <div>
                      <span
                        style={{
                          ...(integration.status === 'online' ? {
                            background: 'var(--good-light)',
                            color: 'var(--good)',
                            border: '1px solid rgba(4, 120, 87, 0.25)'
                          } : {
                            background: 'var(--bad-light)',
                            color: 'var(--bad)',
                            border: '1px solid rgba(185, 28, 28, 0.25)'
                          }),
                          padding: '0.125rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-medium)',
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
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text)', 
              marginBottom: 'var(--spacing-sm)'
            }}>
              Последние события
            </div>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              {recentDeliveries.slice(0, 5).map((delivery) => (
                <div
                  key={delivery.id}
                  className="row"
                  style={{ 
                    padding: 'var(--spacing-sm)', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--brand-light)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
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
                    <div style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      fontWeight: 'var(--font-weight-semibold)', 
                      color: 'var(--text)'
                    }}>
                      {delivery.event_type}
                    </div>
                    <div style={{ 
                      fontSize: 'var(--font-size-xs)', 
                      color: 'var(--muted)'
                    }}>
                      {formatTime(delivery.created_at)}
                      {delivery.http_status && ` · HTTP ${delivery.http_status}`}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'var(--spacing-sm)' }}>
                    <span
                      style={{
                        ...getDeliveryStatusColor(delivery.status),
                        padding: '0.125rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)',
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
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text)', 
              marginBottom: 'var(--spacing-sm)'
            }}>
              Статистика за 24ч
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              {deliveryStats.success > 0 && (
                <div className="pill pillGood">
                  Успех: {deliveryStats.success}
                </div>
              )}
              {deliveryStats.failed > 0 && (
                <div className="pill pillBad">
                  Ошибки: {deliveryStats.failed}
                </div>
              )}
              {deliveryStats.pending > 0 && (
                <div className="pill pillWarn">
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
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-semibold)', 
              color: 'var(--text)', 
              marginBottom: 'var(--spacing-sm)'
            }}>
              Последние синхронизации
            </div>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              {Object.entries(lastSyncs).map(([integration, syncData]) => (
                <div
                  key={integration}
                  className="row"
                  style={{ 
                    padding: 'var(--spacing-sm)', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--brand-light)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
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
                    {integration}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>
                    {new Date(syncData).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {integrations.length === 0 && recentDeliveries.length === 0 && Object.keys(deliveryStats).length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-xl) var(--spacing-lg)', 
            color: 'var(--muted)', 
            fontSize: 'var(--font-size-sm)'
          }}>
            Интеграции не настроены
          </div>
        )}
      </div>
    </div>
  );
};
