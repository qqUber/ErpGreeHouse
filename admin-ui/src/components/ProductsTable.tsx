import React from 'react';
import { useTranslation } from 'react-i18next';
import { Product } from '../api';
import { Pagination } from './Pagination';

interface ProductsTableProps {
  products: Product[];
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

export function ProductsTable({
  products,
  page,
  total,
  limit,
  onPageChange,
  loading,
}: ProductsTableProps) {
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

  if (products.length === 0) {
    return (
      <div className="card cardFull">
        <div className="text-center py-8">
          <div className="text-muted">{t('products.noProducts')}</div>
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
                  {t('products.code')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {t('products.name')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {t('products.category')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {t('products.price')}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {t('products.status')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{product.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-500">{product.kind}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{product.price} ₽</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {product.active ? t('products.active') : t('products.inactive')}
                    </span>
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
