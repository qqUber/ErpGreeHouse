import {
  Api,
  MarketingCampaign,
  MarketingCampaignPreview,
  MarketingSegment,
  MarketingTrigger,
} from '../api';

export interface MarketingCampaignPayload {
  name: string;
  segment_id: number | null;
  type: string;
  content: string;
  content_type?: string;
  media_urls?: string;
  caption?: string;
  scheduled_at?: string;
  budget_limit?: number | null;
}

export interface MarketingDataBundle {
  campaigns: MarketingCampaign[];
  segments: MarketingSegment[];
  triggers: MarketingTrigger[];
}

function normalizeCollection<T>(response: { items?: T[] } | T[]): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.items)) {
    return response.items;
  }

  return [];
}

export const marketingService = {
  async loadAll(): Promise<MarketingDataBundle> {
    const [campaignsResponse, segmentsResponse, triggersResponse] = await Promise.all([
      Api.marketingCampaigns(),
      Api.marketingSegments(),
      Api.marketingTriggers(),
    ]);

    return {
      campaigns: normalizeCollection<MarketingCampaign>(campaignsResponse),
      segments: normalizeCollection<MarketingSegment>(segmentsResponse),
      triggers: normalizeCollection<MarketingTrigger>(triggersResponse),
    };
  },

  async createCampaign(payload: MarketingCampaignPayload): Promise<MarketingCampaign> {
    const response = await Api.createMarketingCampaign(payload);
    return response.campaign;
  },

  previewCampaign(payload: MarketingCampaignPayload): Promise<MarketingCampaignPreview> {
    return Api.previewMarketingCampaign(payload);
  },

  async sendCampaign(id: number): Promise<MarketingCampaign> {
    const response = await Api.sendMarketingCampaign(id);
    return response.campaign;
  },

  async pauseCampaign(id: number): Promise<MarketingCampaign> {
    const response = await Api.pauseMarketingCampaign(id);
    return response.campaign;
  },

  async resumeCampaign(id: number): Promise<MarketingCampaign> {
    const response = await Api.resumeMarketingCampaign(id);
    return response.campaign;
  },

  async cancelCampaign(id: number): Promise<MarketingCampaign> {
    const response = await Api.cancelMarketingCampaign(id);
    return response.campaign;
  },

  async updateCampaignBudget(id: number, budgetLimit: number | null): Promise<MarketingCampaign> {
    const response = await Api.updateMarketingCampaignBudget(id, budgetLimit);
    return response.campaign;
  },
};
