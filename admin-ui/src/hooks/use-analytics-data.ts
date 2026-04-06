import { useQuery } from '@tanstack/react-query';
import {
  Api,
  ChartData,
  CustomerSegmentation,
  DashboardOverview,
  LoyaltyDetailedReport,
  LoyaltyReportOverview,
} from '../api';

export type AnalyticsDataBundle = {
  overview: DashboardOverview;
  salesChart: ChartData;
  customerChart: ChartData;
  loyaltyChart: ChartData;
  loyaltyOverview: LoyaltyReportOverview;
  loyaltyDetails: LoyaltyDetailedReport;
  segmentation: CustomerSegmentation;
};

type UseAnalyticsDataOptions = {
  timeRange: string;
  enabled?: boolean;
};

export function useAnalyticsData({ timeRange, enabled = true }: UseAnalyticsDataOptions) {
  return useQuery<AnalyticsDataBundle>({
    queryKey: ['analytics-data', timeRange],
    queryFn: async () => {
      const [
        overview,
        salesChart,
        customerChart,
        loyaltyChart,
        loyaltyOverview,
        loyaltyDetails,
        segmentation,
      ] = await Promise.all([
        Api.dashboardOverview(timeRange),
        Api.salesChart(timeRange),
        Api.customerChart(timeRange),
        Api.loyaltyChart(timeRange),
        Api.loyaltyReportOverview(timeRange),
        Api.loyaltyDetailedReport(timeRange),
        Api.customerSegmentation(),
      ]);

      return {
        overview,
        salesChart,
        customerChart,
        loyaltyChart,
        loyaltyOverview,
        loyaltyDetails,
        segmentation,
      };
    },
    staleTime: 60_000,
    enabled,
  });
}
