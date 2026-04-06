import { useQuery } from '@tanstack/react-query';
import { Api, CustomerListItem } from '../api';

type UseCustomerSuggestionsOptions = {
  query: string;
  enabled?: boolean;
};

export function useCustomerSuggestions({ query, enabled = true }: UseCustomerSuggestionsOptions) {
  const normalizedQuery = query.trim();

  return useQuery<CustomerListItem[]>({
    queryKey: ['customer-suggestions', normalizedQuery],
    queryFn: async () => {
      const response = await Api.customers(normalizedQuery, 1, 5);
      return response.items;
    },
    enabled: enabled && normalizedQuery.length > 0,
    staleTime: 15_000,
  });
}
