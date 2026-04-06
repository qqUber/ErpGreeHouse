import { useQuery } from '@tanstack/react-query';
import { Api } from '../api';

export type PublicStatus = {
  admin_auth_configured: boolean;
  debug_mode: boolean;
  erp_sync_enabled: boolean;
};

type PublicStatusEnvelope = {
  api: string;
  admin_auth_configured: boolean;
  debug_mode: boolean;
  erp_sync_enabled: boolean;
};

export function usePublicStatus() {
  return useQuery<PublicStatus | null>({
    queryKey: ['public-status'],
    queryFn: async () => {
      try {
        const response = (await Api.publicStatus()) as PublicStatusEnvelope;
        return {
          admin_auth_configured: response.admin_auth_configured,
          debug_mode: response.debug_mode,
          erp_sync_enabled: response.erp_sync_enabled,
        };
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
}
