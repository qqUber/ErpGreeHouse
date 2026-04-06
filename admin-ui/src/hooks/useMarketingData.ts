import { useQuery } from '@tanstack/react-query';
import { MarketingCampaign, MarketingSegment, MarketingTrigger } from '../api';
import { marketingService } from '../services/marketing.service';

export interface UseMarketingDataResult {
  campaigns: MarketingCampaign[];
  segments: MarketingSegment[];
  triggers: MarketingTrigger[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMarketingData(): UseMarketingDataResult {
  const query = useQuery({
    queryKey: ['marketing-data'],
    queryFn: () => marketingService.loadAll(),
    staleTime: 30_000,
  });

  return {
    campaigns: query.data?.campaigns ?? [],
    segments: query.data?.segments ?? [],
    triggers: query.data?.triggers ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}
