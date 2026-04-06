import { useQuery } from '@tanstack/react-query';
import { Api, ConsentRecord } from '../api';

type UseConsentsOptions = {
  customerId?: number;
  enabled?: boolean;
};

export function useConsents({ customerId, enabled = true }: UseConsentsOptions = {}) {
  return useQuery<ConsentRecord[]>({
    queryKey: ['consents', customerId ?? 'all'],
    queryFn: async () => {
      if (customerId) {
        const response = await Api.getCustomerConsents(customerId);
        return response.items;
      }

      const response = await Api.listConsents();
      return response.items;
    },
    enabled,
  });
}
