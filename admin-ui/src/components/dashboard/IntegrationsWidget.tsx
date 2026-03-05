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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
        <h3 className="text-lg font-semibold text-gray-900">Интеграции</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Успешность: {successRate.toFixed(1)}%
          </span>
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {pendingCount} в очереди
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Integration Status Grid */}
        {integrations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Статус интеграций</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {integrations.map((integration, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl">{getIntegrationIcon(integration.kind)}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {integration.name}
                      </div>
                      <div className="text-xs text-gray-500">{integration.kind}</div>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          integration.status === 'online'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Последние события</h4>
            <div className="space-y-2">
              {recentDeliveries.slice(0, 5).map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {delivery.event_type}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(delivery.created_at)}
                      {delivery.http_status && ` · HTTP ${delivery.http_status}`}
                    </div>
                  </div>
                  <div className="ml-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDeliveryStatusColor(delivery.status)}`}
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">Статистика за 24ч</h4>
            <div className="flex space-x-2">
              {deliveryStats.success > 0 && (
                <div className="bg-green-50 px-2 py-1 rounded text-xs text-green-700">
                  Успех: {deliveryStats.success}
                </div>
              )}
              {deliveryStats.failed > 0 && (
                <div className="bg-red-50 px-2 py-1 rounded text-xs text-red-700">
                  Ошибки: {deliveryStats.failed}
                </div>
              )}
              {deliveryStats.pending > 0 && (
                <div className="bg-yellow-50 px-2 py-1 rounded text-xs text-yellow-700">
                  В очереди: {deliveryStats.pending}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Syncs */}
        {Object.keys(lastSyncs).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Последние синхронизации</h4>
            <div className="space-y-2">
              {Object.entries(lastSyncs).map(([integration, syncData]) => (
                <div
                  key={integration}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                >
                  <div className="text-sm text-gray-900">{integration}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(syncData).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {integrations.length === 0 && recentDeliveries.length === 0 && Object.keys(deliveryStats).length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">Интеграции не настроены</div>
          </div>
        )}
      </div>
    </div>
  );
};
