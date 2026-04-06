import { useQuery } from '@tanstack/react-query';
import { Api, CustomerListItem, PaginationInfo } from '../api';

type UseCustomersOptions = {
  query: string;
  page: number;
  limit: number;
  enabled?: boolean;
};

export type CustomersQueryData = {
  items: CustomerListItem[];
  pagination: PaginationInfo;
};

function normalizeCustomerQuery(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  if (/^\d+$/.test(trimmed)) {
    return `id:${trimmed}`;
  }

  if (/^\d{8}$/.test(trimmed)) {
    return `qr:${trimmed}`;
  }

  if (/^([><=!])(\d+)(<(\d+))?$/.test(trimmed)) {
    const match = trimmed.match(/^([><=!])(\d+)(<(\d+))?$/);
    if (match) {
      const [, operator, value1, , value2] = match;
      if (operator === '>' && value2) {
        return `balance:${value1}-${value2}`;
      }
      if (operator === '>') {
        return `balance>${value1}`;
      }
      if (operator === '<') {
        return `balance<${value1}`;
      }
      if (operator === '!' || operator === '!=') {
        return `balance!${value1}`;
      }
    }
  }

  if (/^[\d\s\-+()]+$/.test(trimmed)) {
    return `phone:${trimmed}`;
  }

  return `name:${trimmed}`;
}

export function useCustomers({ query, page, limit, enabled = true }: UseCustomersOptions) {
  const normalizedQuery = normalizeCustomerQuery(query);

  return useQuery<CustomersQueryData>({
    queryKey: ['customers', normalizedQuery, page, limit],
    queryFn: () => Api.customers(normalizedQuery, page, limit),
    staleTime: 30_000,
    enabled,
  });
}
