import React from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerListItem } from '../api';
import { Pagination } from './Pagination';

interface CustomersTableProps {
  customers: CustomerListItem[];
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onCustomerSelect: (id: number) => void;
  loading: boolean;
}

export function CustomersTable({
  customers,
  page,
  total,
  limit,
  onPageChange,
  onCustomerSelect,
  loading,
}: CustomersTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="card cardFull">
        <div className="text-center py-8">
          <div className="spinner" />
          <div className="mt-2">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="card cardFull">
        <div className="text-center py-8">
          <div className="text-muted">{t('customers.noCustomers')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card cardFull">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {t('customers.name')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {t('customers.phone')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {t('customers.balance')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {t('customers.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{customer.full_name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-500">{customer.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-500">{customer.balance_points} ₽</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onCustomerSelect(customer.id)}
                      className="text-blue-600 hover:text-blue-900"
                      data-testid={`customer_select_${customer.id}`}
                    >
                      {t('customers.viewDetails')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={Math.ceil(total / limit)}
        total={total}
        limit={limit}
        onPageChange={onPageChange}
      />
    </div>
  );
}
