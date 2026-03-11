import React from 'react';
import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';

type AnalyticsData = {
  customers?: { total_customers?: number };
  products?: { top_products_today?: Array<any> };
  operational?: { total_transactions?: number };
};

export function AnalyticsWidget({ data }: { data?: AnalyticsData }) {
  const { t } = useTranslation();
  const customers = Number(data?.customers?.total_customers ?? 0);
  const products = Number(data?.products?.top_products_today?.length ?? 0);
  const tx = Number(data?.operational?.total_transactions ?? 0);
  return (
    <Widget title={t('analytics.title')} compactable={false}>
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-lg font-semibold">{t('widgets.analytics.dashboardTitle')}</div>
          <div className="text-sm text-gray-500 mt-1">{t('widgets.analytics.dashboardDesc')}</div>
          <div className="text-sm text-gray-500 mt-3">
            {t('menu.clients')}: {customers} · {t('menu.products')}: {products} · {t('sales.title')}
            : {tx}
          </div>
        </div>
      </div>
    </Widget>
  );
}
