import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Widget } from '../Widget';

type ProductsData = {
  top_products_today?: Array<{ name?: string }>;
  trending_products?: Array<{ growth_percent?: number }>;
};

export function ProductsWidget({ data }: { data?: ProductsData }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const total = Number(data?.top_products_today?.length ?? 0);
  const newWeek = Number(
    (data?.trending_products || []).filter((p) => Number(p?.growth_percent || 0) > 0).length
  );
  const topSelling = data?.top_products_today?.[0]?.name || t('widgets.products.espresso');
  const lowStock = Math.max(0, total - newWeek);

  const compactContent = (
    <div className="text-center">
      <div className="text-3xl font-bold text-green-600">{total}</div>
      <div className="text-sm text-gray-500">{t('widgets.products.activeProducts')}</div>
      <div className="text-sm text-gray-500 mt-1">
        {t('widgets.common.plusThisWeek', { count: newWeek })}
      </div>
    </div>
  );

  const expandedContent = (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('widgets.products.details')}</h3>
      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-500">{t('widgets.products.newProducts')}</div>
          <div className="text-xl font-bold">{newWeek}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('widgets.products.topSelling')}</div>
          <div className="text-xl font-bold">{topSelling}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">{t('widgets.products.stockLevels')}</div>
          <div className="text-xl font-bold">
            {t('widgets.products.lowItems', { count: lowStock })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Widget
      title={t('widgets.products.title')}
      isExpanded={isExpanded}
      onExpand={() => setIsExpanded(true)}
      onCollapse={() => setIsExpanded(false)}
      compactContent={compactContent}
      expandedContent={expandedContent}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.products.totalProducts')}</span>
          <span className="text-lg font-semibold">{total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.common.newThisWeek')}</span>
          <span className="text-lg font-semibold">{newWeek}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.products.topSelling')}</span>
          <span className="text-lg font-semibold">{topSelling}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{t('widgets.products.lowStock')}</span>
          <span className="text-lg font-semibold">{lowStock}</span>
        </div>
      </div>
    </Widget>
  );
}
