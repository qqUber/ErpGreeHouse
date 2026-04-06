import { useQuery } from '@tanstack/react-query';
import { Api, IntegrationDelivery } from '../api';

type UseIntegrationDeliveriesOptions = {
  integrationId: number | null;
  enabled?: boolean;
};

export function useIntegrationDeliveries({
  integrationId,
  enabled = true,
}: UseIntegrationDeliveriesOptions) {
  return useQuery<IntegrationDelivery[]>({
    queryKey: ['integration-deliveries', integrationId],
    enabled: enabled && integrationId != null,
    queryFn: async () => {
      if (integrationId == null) {
        return [];
      }
      const response = await Api.integrationDeliveries(integrationId);
      return response.items;
    },
  });
}
