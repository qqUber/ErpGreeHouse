import { useQuery } from '@tanstack/react-query';
import { Api, Product } from '../api';

type UseProductsOptions = {
  enabled?: boolean;
};

export function useProducts({ enabled = true }: UseProductsOptions = {}) {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await Api.products();
      return response.items;
    },
    staleTime: 30_000,
    enabled,
  });
}
