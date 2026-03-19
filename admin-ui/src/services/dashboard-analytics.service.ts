import { Api } from '../api';
import { Role } from '../types/roles';

export interface SalesCardViewModel {
  revenue: number;
  transactions: number;
  avgCheck: number;
  peakHour: number | null;
  peakHourTransactions: number;
  topProducts: Array<{ code?: string; name?: string; quantity?: number; revenue?: number }>;
}

export interface CustomerCardViewModel {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  reachableCustomers: number;
  consentRate: number;
  topCustomers: Array<{
    id?: number;
    name?: string;
    phone?: string;
    total_spent?: number;
    transactions?: number;
    telegram_id?: number | null;
    vk_id?: number | null;
    marketing_allowed?: boolean;
    balance_points?: number;
    ltv?: number;
    last_purchase_date?: string;
  }>;
  priorityActions: Array<{ id: string; title: string; count: number; tone: string }>;
}

export interface TopProductsCardViewModel {
  totalProducts: number;
  topProducts: Array<{ code?: string; name?: string; quantity?: number; revenue?: number }>;
  categoryTrend: Array<{
    category?: string;
    transactions?: number;
    items_sold?: number;
    revenue?: number;
  }>;
  topProductName: string;
}

export interface CampaignPulseCardViewModel {
  activeCampaigns: number;
  upcomingCount: number;
  needsAttention: number;
  messagesSent24h: number;
  recentEvents: Array<{
    id?: number;
    trigger_name?: string;
    customer_name?: string;
    status?: string;
    created_at?: string;
  }>;
}

export interface LoyaltyCardViewModel {
  pointsEarned: number;
  pointsRedeemed: number;
  redemptionRate: number;
  avgOrderValue: number;
  revenue: number;
}

export interface AttentionRequiredCardViewModel {
  items: Array<{ id: string; title: string; value: number; tone: string; suffix?: string }>;
  priority?: { id: string; title: string; value: number; tone: string; suffix?: string } | null;
}

export interface IntegrationsCardViewModel {
  integrations: Array<{ name?: string; kind?: string; status?: string }>;
  recentDeliveries: Array<{
    id?: number;
    event_type?: string;
    status?: string;
    http_status?: number;
    created_at?: string;
  }>;
  deliveryStats24h: Record<string, number>;
  successRate: number;
  pendingCount: number;
}

export interface DashboardHomeViewModel {
  generatedAt: string;
  salesCard: SalesCardViewModel;
  customerCard: CustomerCardViewModel;
  topProductsCard: TopProductsCardViewModel;
  campaignPulseCard: CampaignPulseCardViewModel;
  loyaltyCard: LoyaltyCardViewModel;
  attentionRequiredCard: AttentionRequiredCardViewModel;
  integrationsCard: IntegrationsCardViewModel;
}

function normalizeDashboardHome(raw: any): DashboardHomeViewModel {
  return {
    generatedAt: raw?.generated_at ?? new Date().toISOString(),
    salesCard: {
      revenue: Number(raw?.salesCard?.headline?.revenue ?? raw?.salesCard?.total_revenue ?? 0),
      transactions: Number(
        raw?.salesCard?.headline?.transactions ?? raw?.salesCard?.total_transactions ?? 0
      ),
      avgCheck: Number(raw?.salesCard?.headline?.avgCheck ?? raw?.salesCard?.average_check ?? 0),
      peakHour: raw?.salesCard?.headline?.peakHour ?? raw?.salesCard?.peak_hour ?? null,
      peakHourTransactions: Number(raw?.salesCard?.peak_hour_transactions ?? 0),
      topProducts: raw?.salesCard?.top_products ?? [],
    },
    customerCard: {
      totalCustomers: Number(raw?.customerCard?.totalCustomers ?? 0),
      newCustomers: Number(raw?.customerCard?.newCustomers ?? 0),
      repeatCustomers: Number(raw?.customerCard?.repeatCustomers ?? 0),
      reachableCustomers: Number(raw?.customerCard?.reachableCustomers ?? 0),
      consentRate: Number(raw?.customerCard?.consentRate ?? 0),
      topCustomers: raw?.customerCard?.topCustomers ?? [],
      priorityActions: raw?.customerCard?.priorityActions ?? [],
    },
    topProductsCard: {
      totalProducts: Number(raw?.topProductsCard?.totalProducts ?? 0),
      topProducts: raw?.topProductsCard?.topProducts ?? [],
      categoryTrend: raw?.topProductsCard?.categoryTrend ?? [],
      topProductName: raw?.topProductsCard?.topProductName ?? '—',
    },
    campaignPulseCard: {
      activeCampaigns: Number(raw?.campaignPulseCard?.activeCampaigns ?? 0),
      upcomingCount: Number(raw?.campaignPulseCard?.upcomingCount ?? 0),
      needsAttention: Number(raw?.campaignPulseCard?.needsAttention ?? 0),
      messagesSent24h: Number(raw?.campaignPulseCard?.messagesSent24h ?? 0),
      recentEvents: raw?.campaignPulseCard?.recentEvents ?? [],
    },
    loyaltyCard: {
      pointsEarned: Number(raw?.loyaltyCard?.pointsEarned ?? 0),
      pointsRedeemed: Number(raw?.loyaltyCard?.pointsRedeemed ?? 0),
      redemptionRate: Number(raw?.loyaltyCard?.redemptionRate ?? 0),
      avgOrderValue: Number(raw?.loyaltyCard?.avgOrderValue ?? 0),
      revenue: Number(raw?.loyaltyCard?.revenue ?? 0),
    },
    attentionRequiredCard: {
      items: raw?.attentionRequiredCard?.items ?? [],
      priority: raw?.attentionRequiredCard?.priority ?? null,
    },
    integrationsCard: {
      integrations: raw?.integrationsCard?.integrations ?? [],
      recentDeliveries: raw?.integrationsCard?.recentDeliveries ?? [],
      deliveryStats24h: raw?.integrationsCard?.deliveryStats24h ?? {},
      successRate: Number(raw?.integrationsCard?.successRate ?? 0),
      pendingCount: Number(raw?.integrationsCard?.pendingCount ?? 0),
    },
  };
}

export class DashboardAnalyticsService {
  async getHomeDashboard(): Promise<DashboardHomeViewModel> {
    const raw = await Api.dashboardHome();
    return normalizeDashboardHome(raw);
  }

  getVisibleWidgetIds(role: Role): string[] {
    if (role === Role.OPERATOR) {
      return ['sales', 'customers', 'products'];
    }
    if (role === Role.MANAGER) {
      return ['sales', 'customers', 'products', 'marketing', 'loyalty', 'attention'];
    }
    return ['sales', 'customers', 'products', 'marketing', 'loyalty', 'attention', 'integrations'];
  }
}

export const dashboardAnalyticsService = new DashboardAnalyticsService();
