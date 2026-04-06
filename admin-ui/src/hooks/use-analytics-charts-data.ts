import { useQuery } from '@tanstack/react-query';
import { Api, CategoryDistribution, SalesByDay, TopProduct } from '../api';

export type AnalyticsChartsDataBundle = {
  salesData: SalesByDay['sales_by_day'];
  topProducts: TopProduct['top_products'];
  categoryData: CategoryDistribution['category_distribution'];
};

type UseAnalyticsChartsDataOptions = {
  days: number;
  enabled?: boolean;
};

export function useAnalyticsChartsData({ days, enabled = true }: UseAnalyticsChartsDataOptions) {
  return useQuery<AnalyticsChartsDataBundle>({
    queryKey: ['analytics-charts-data', days],
    queryFn: async () => {
      const [sales, products, categories] = await Promise.all([
        Api.salesByDay(days),
        Api.topProducts(days, 10),
        Api.categoryDistribution(days),
      ]);

      return {
        salesData: sales.sales_by_day,
        topProducts: products.top_products,
        categoryData: categories.category_distribution,
      };
    },
    staleTime: 60_000,
    enabled,
  });
}
