import { useCallback, useEffect, useState } from 'react';
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
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [triggers, setTriggers] = useState<MarketingTrigger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await marketingService.loadAll();
      setCampaigns(data.campaigns);
      setSegments(data.segments);
      setTriggers(data.triggers);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    campaigns,
    segments,
    triggers,
    loading,
    error,
    refresh,
  };
}
