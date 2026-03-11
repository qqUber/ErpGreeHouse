import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';

type CustomersData = {
  total_customers?: number;
  new_customers?: { this_week?: number };
};

export function CustomersWidget({ data }: { data?: CustomersData }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const total = Number(data?.total_customers ?? 0);
  const newWeek = Number(data?.new_customers?.this_week ?? 0);
  const returning = Math.max(0, total - newWeek);
  const active = total;

  const compactContent = (
    <div className="text-center">
      <div className="text-3xl font-bold text-blue-600">{total}</div>
      <div className="text-sm text-gray-500">{t('widgets.customers.activeCustomers')}</div>
      <div className="text-sm text-gray-500 mt-1">
        {t('widgets.common.plusThisWeek', { count: newWeek })}
      </div>
    </div>
  );

  const expandedContent = (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('widgets.customers.details')}</h3>
      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-500">{t('widgets.customers.newCustomers')}</div>
          <div className="text-xl font-bold">{newWeek}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('widgets.customers.returningCustomers')}</div>
          <div className="text-xl font-bold">{returning}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('widgets.customers.avgVisitFrequency')}</div>
          <div className="text-xl font-bold">
            {t('widgets.customers.visitsPerWeek', { count: 2.3 })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Widget
      title={t('widgets.customers.title')}
      isExpanded={isExpanded}
      onExpand={() => setIsExpanded(true)}
      onCollapse={() => setIsExpanded(false)}
      compactContent={compactContent}
      expandedContent={expandedContent}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.customers.totalCustomers')}</span>
          <span className="text-lg font-semibold">{total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.common.newThisWeek')}</span>
          <span className="text-lg font-semibold">{newWeek}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.customers.returning')}</span>
          <span className="text-lg font-semibold">{returning}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.common.active')}</span>
          <span className="text-lg font-semibold">{active}</span>
        </div>
      </div>
    </Widget>
  );
}
