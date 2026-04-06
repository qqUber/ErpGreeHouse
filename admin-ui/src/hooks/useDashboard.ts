import { useQuery } from '@tanstack/react-query';
import { Api } from '../api';

export interface OperationalData {
  date: string;
  hourly_breakdown: Array<{
    hour: number;
    transactions: number;
    revenue: number;
  }>;
  top_products: Array<{
    code: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  active_staff: number;
  total_transactions: number;
  total_revenue: number;
  average_check: number;
  peak_hour: number;
  peak_hour_transactions: number;
}

export interface MarketingData {
  active_campaigns: number;
  recent_trigger_events: Array<{
    id: number;
    trigger_name: string;
    customer_name: string;
    status: string;
    created_at: string;
  }>;
  trigger_stats_24h: Record<string, number>;
  campaign_performance: Array<any>;
  upcoming_campaigns: Array<any>;
}

export interface CustomerData {
  new_customers: {
    today: number;
    this_week: number;
    this_month: number;
  };
  new_customers_timeline: Array<{
    date: string;
    count: number;
  }>;
  top_customers: Array<{
    id: number;
    name: string;
    phone: string;
    total_spent: number;
    transactions: number;
  }>;
  birthdays_this_week: Array<{
    id: number;
    name: string;
    birthday: string;
  }>;
  loyalty_tiers: Array<{
    tier: string;
    count: number;
  }>;
  total_customers: number;
}

export interface ProductData {
  total_products?: number; // Add total products count
  top_products_today: Array<{
    code: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  category_performance: Array<{
    category: string;
    transactions: number;
    items_sold: number;
    revenue: number;
  }>;
  trending_products: Array<{
    code: string;
    name: string;
    this_week: number;
    last_week: number;
    growth_percent: number;
  }>;
  date: string;
}

export interface IntegrationData {
  integrations: Array<{
    name: string;
    kind: string;
    status: string;
  }>;
  recent_deliveries: Array<{
    id: number;
    event_type: string;
    status: string;
    http_status?: number;
    created_at: string;
  }>;
  delivery_stats_24h: Record<string, number>;
  success_rate: number;
  pending_count: number;
  last_syncs: Record<string, any>;
}

export interface DashboardData {
  operational: OperationalData | null;
  marketing: MarketingData | null;
  customers: CustomerData | null;
  products: ProductData | null;
  integrations: IntegrationData | null;
}

export const useDashboard = () => {
  const query = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [operational, marketing, customers, products, integrations, productsList] =
        await Promise.all([
          Api.dashboardOperational(),
          Api.dashboardMarketing(),
          Api.dashboardCustomers(),
          Api.dashboardProducts(),
          Api.dashboardIntegrations(),
          Api.products(),
        ]);

      const totalProducts = productsList?.pagination?.total || 0;

      return {
        operational,
        marketing,
        customers,
        products: {
          ...products,
          total_products: totalProducts,
        },
        integrations,
      };
    },
  });

  const data: DashboardData = query.data ?? {
    operational: null,
    marketing: null,
    customers: null,
    products: null,
    integrations: null,
  };

  return {
    data,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
};
