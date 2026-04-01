import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../ui/StatCard';
import { Widget } from '../Widget';

type ProductsData = {
  totalProducts?: number;
  topProducts?: Array<{
    code?: string;
    name?: string;
    quantity?: number;
    revenue?: number;
  }>;
  categoryTrend?: Array<{
    code?: string;
    name?: string;
  }>;
  topProductName?: string;
  // Real low stock data from API
  lowStockData?: {
    total: number;
    items: Array<{
      product_id: number;
      product_code: string;
      product_name: string;
      current_stock: number;
      min_stock_level: number;
      deficit: number;
      location_name: string;
      city_name: string;
    }>;
  };
  // Selected location for filtering
  selectedLocationId?: number | null;
};

export function ProductsWidget({ data }: { data?: any }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const total = Number(data?.totalProducts ?? 0);
  const topProducts = data?.topProducts ?? [];
  const trendingCount = Array.isArray(data?.categoryTrend) ? data.categoryTrend.length : 0;
  const newWeek = trendingCount;
  const topSelling = data?.topProductName ?? topProducts[0]?.name ?? '—';
  const demandSignal = topProducts.reduce(
    (sum: number, product: any) => sum + Number(product.quantity ?? 0),
    0
  );
  const lowStockData = data?.lowStockData;
  const lowStock = lowStockData?.total ?? 0;
  const lowStockItems = lowStockData?.items ?? [];

  const renderLowStockRow = (item: {
    product_id: number;
    product_code: string;
    product_name: string;
    current_stock: number;
    min_stock_level: number;
    deficit: number;
    location_name: string;
    city_name: string;
  }) => (
    <div key={`${item.product_id}-${item.location_name}`} className="row-item-2026">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-gray-500">{item.product_code}</span>
        <span className="font-medium">{item.product_name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="badge-2026 badge-2026-warning">
          {item.current_stock} / {item.min_stock_level}
        </span>
        <span className="badge-2026 badge-2026-primary">
          {item.city_name} — {item.location_name}
        </span>
      </div>
    </div>
  );

  const compactContent = (
    <div className="kpi-grid-2026 animate-fade-in-up">
      <div className="stat-card-2026 stat-card-2026-success">
        <div className="kpi-value-2026 text-green-600">{total}</div>
        <div className="kpi-label-2026">{t('widgets.products.activeProducts')}</div>
      </div>
      <div className="stat-card-2026 stat-card-2026-info">
        <div className="kpi-value-2026 text-indigo-600">{trendingCount}</div>
        <div className="kpi-label-2026">{t('widgets.products.trendingNow')}</div>
      </div>
      <div className="stat-card-2026 stat-card-2026-warning">
        <div className="kpi-value-2026 text-amber-600">{demandSignal}</div>
        <div className="kpi-label-2026">{t('widgets.products.demandSignal')}</div>
      </div>
    </div>
  );

  const renderProductRow = (product: {
    code?: string;
    name?: string;
    quantity?: number;
    revenue?: number;
    growth_percent?: number;
  }) => (
    <div key={`${product.code ?? product.name}`} className="row-item-2026">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-gray-500">{product.code ?? '--'}</span>
        <span className="font-medium">{product.name ?? t('widgets.products.unnamedProduct')}</span>
      </div>
      <div className="flex items-center gap-2">
        {Number.isFinite(Number(product.quantity)) && (
          <span className="badge-2026 badge-2026-primary">
            {t('widgets.products.quantity')} {Number(product.quantity ?? 0)}
          </span>
        )}
        {Number.isFinite(Number(product.revenue)) && (
          <span className="badge-2026 badge-2026-success">
            {t('widgets.products.revenue')} {Number(product.revenue ?? 0).toLocaleString()}
          </span>
        )}
        {Number.isFinite(Number(product.growth_percent)) && (
          <span className="badge-2026 badge-2026-info">
            {t('widgets.products.trend')} {Number(product.growth_percent ?? 0)}%
          </span>
        )}
      </div>
    </div>
  );

  const expandedContent = (
    <div className="dashboard-widget-2026">
      <section className="mb-4">
        <h3 className="section-title-2026">
          {t('widgets.products.summaryTitle', 'Product overview')}
        </h3>
        <div className="crm-summary-grid grid grid-cols-2 gap-4">
          <StatCard
            variant="primary"
            value={total.toLocaleString()}
            label={t('widgets.products.totalProducts', 'Total Products')}
            className="stat-card-gradient stat-card-gradient-primary"
          />
          <StatCard
            variant="info"
            value={trendingCount.toLocaleString()}
            label={t('widgets.products.trendingNow')}
            className="stat-card-gradient stat-card-gradient-info"
          />
          <StatCard
            variant="warning"
            value={demandSignal.toLocaleString()}
            label={t('widgets.products.demandSignal')}
            className="stat-card-gradient stat-card-gradient-warning"
          />
          <StatCard
            variant={lowStock > 0 ? 'warning' : 'success'}
            value={(lowStock > 0 ? lowStock : 0).toLocaleString()}
            label={t('widgets.products.lowStock')}
            className={`stat-card-gradient stat-card-gradient-${lowStock > 0 ? 'warning' : 'success'}`}
          />
        </div>
      </section>

      <section className="mb-4">
        <h3 className="section-title-2026">
          {t('widgets.products.topProductsTitle', 'Top products')}
        </h3>
        <div className="space-y-2">
          {topProducts.length ? (
            topProducts.slice(0, 5).map((product: any, index: number) => (
              <div key={`${product.code ?? product.name}-${index}`} className="row-item-2026">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-gray-500">{product.code ?? '--'}</span>
                  <span className="font-medium">
                    {product.name ?? t('widgets.products.unnamedProduct')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {Number.isFinite(Number(product.quantity)) && (
                    <span className="badge-2026 badge-2026-primary">
                      {t('widgets.products.quantity')} {Number(product.quantity ?? 0)}
                    </span>
                  )}
                  {Number.isFinite(Number(product.revenue)) && (
                    <span className="badge-2026 badge-2026-success">
                      {t('widgets.products.revenue')}{' '}
                      {Number(product.revenue ?? 0).toLocaleString()}
                    </span>
                  )}
                  {Number.isFinite(Number(product.growth_percent)) && (
                    <span className="badge-2026 badge-2026-info">
                      {t('widgets.products.trend')} {Number(product.growth_percent ?? 0)}%
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="crm-empty-state">
              {t('widgets.products.noTopProducts', 'No top products available.')}
            </div>
          )}
        </div>
      </section>

      {lowStockItems.length > 0 && (
        <section className="mb-4">
          <h3 className="section-title-2026 text-amber-600">
            {t('widgets.products.lowStockTitle', 'Low stock risk')} ({lowStock})
          </h3>
          <div className="space-y-2">{lowStockItems.map(renderLowStockRow)}</div>
        </section>
      )}
    </div>
  );

  return (
    <Widget
      title={t('widgets.products.title')}
      isExpanded={isExpanded}
      onExpand={() => {
        setIsExpanded(true);
      }}
      onCollapse={() => {
        setIsExpanded(false);
      }}
      compactContent={compactContent}
      expandedContent={expandedContent}
    />
  );
}
