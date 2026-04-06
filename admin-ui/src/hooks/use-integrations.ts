import { useQuery } from '@tanstack/react-query';
import { Api, Integration, IntegrationTemplate } from '../api';

type UseIntegrationsOptions = {
  enabled?: boolean;
};

export function useIntegrations({ enabled = true }: UseIntegrationsOptions = {}) {
  return useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: () => Api.integrations(),
    enabled,
  });
}

export function useIntegrationTemplates({ enabled = true }: UseIntegrationsOptions = {}) {
  return useQuery<IntegrationTemplate[]>({
    queryKey: ['integration-templates'],
    queryFn: async () => {
      const response = await Api.integrationTemplates();
      return response.items;
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}
