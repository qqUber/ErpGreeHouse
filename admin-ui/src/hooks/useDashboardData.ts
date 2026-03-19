import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardAnalyticsService } from '../services/dashboard-analytics.service';

interface UseDashboardDataOptions {
  enabled?: boolean;
  roleKey?: string | null;
}

export function useDashboardData({
  enabled = true,
  roleKey = 'anonymous',
}: UseDashboardDataOptions = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['dashboard-home', roleKey],
    queryFn: () => dashboardAnalyticsService.getHomeDashboard(),
    staleTime: 60_000,
    enabled,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: async () => {
      await query.refetch();
    },
    invalidate: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard-home', roleKey] });
    },
  };
}
