import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);

  const total = Number(data?.totalProducts ?? 0);
  const topProducts = data?.topProducts ?? [];
  const trendingCount = Array.isArray(data?.categoryTrend) ? data.categoryTrend.length : 0;
  const newWeek = trendingCount;
  const topSelling = data?.topProductName ?? topProducts[0]?.name ?? '—';
  const demandSignal = topProducts.reduce(
    (sum: number, product: any) => sum + Number(product.quantity ?? 0),
    0
  );
  // Use real low stock data from API instead of fake calculation
  const lowStockData = data?.lowStockData;
  const lowStock = lowStockData?.total ?? 0;
  const lowStockItems = lowStockData?.items ?? [];
  const selectedProduct =
    topProducts.find((product: any) => (product.code ?? product.name) === selectedProductCode) ??
    null;

  // Render low stock item row
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
    <div key={`${item.product_id}-${item.location_name}`} className="row-item-2026 border-l-4 border-l-amber-500">
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
    <button
      key={`${product.code ?? product.name}`}
      type="button"
      className="row-item-2026"
      onClick={() => setSelectedProductCode(product.code ?? product.name ?? null)}
    >
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
            {t('widgets.products.revenue')} {Number(product.revenue ?? 0).toLocaleString()}
          </span>
        )}
        {Number.isFinite(Number(product.growth_percent)) && (
          <span className="badge-2026 badge-2026-info">
            {t('widgets.products.trend')} {Number(product.growth_percent ?? 0)}%
          </span>
        )}
      </div>
    </button>
  );

  const expandedContent = (
    <div className="dashboard-widget-2026">
      <section className="stat-card-2026 stat-card-2026-primary mb-4">
        <h3 className="section-title-2026">
          {selectedProduct ? 'Product profile' : 'Product overview'}
        </h3>
        {selectedProduct ? (
          <button
            type="button"
            className="text-sm text-primary-600 hover:text-primary-700 mb-3"
            onClick={() => setSelectedProductCode(null)}
          >
            ← Back to list
          </button>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          {selectedProduct ? (
            <>
              <div className="kpi-card-2026">
                <div className="text-xs text-gray-500 uppercase">Code</div>
                <div className="font-mono text-lg">{selectedProduct.code ?? '—'}</div>
              </div>
              <div className="kpi-card-2026">
                <div className="text-xs text-gray-500 uppercase">Name</div>
                <div className="font-medium text-lg">{selectedProduct.name ?? '—'}</div>
              </div>
              <div className="kpi-card-2026">
                <div className="text-xs text-gray-500 uppercase">Quantity</div>
                <div className="text-xl font-bold text-indigo-600">{Number(selectedProduct.quantity ?? 0)}</div>
              </div>
              <div className="kpi-card-2026">
                <div className="text-xs text-gray-500 uppercase">Revenue</div>
                <div className="text-xl font-bold text-green-600">{Number(selectedProduct.revenue ?? 0).toLocaleString()}</div>
              </div>
            </>
          ) : (
            <>
              <div className="kpi-card-2026">
                <div className="text-xs text-gray-500 uppercase">Total Products</div>
                <div className="text-xl font-bold text-indigo-600">{total}</div>
              </div>
              <div className="kpi-card-2026">
                <div className="text-xs text-gray-500 uppercase">Trending</div>
                <div className="text-xl font-bold text-blue-600">{trendingCount}</div>
              </div>
              <div className="kpi-card-2026">
                <div className="text-xs text-gray-500 uppercase">Demand Signal</div>
                <div className="text-xl font-bold text-amber-600">{demandSignal}</div>
              </div>
              <div className="kpi-card-2026">
                <div className="text-xs text-gray-500 uppercase">Low Stock Risk</div>
                <div className={`text-xl font-bold ${lowStock > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowStock > 0 ? 'Watchlist' : 'Healthy'}</div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mb-4">
        <h3 className="section-title-2026">Top products</h3>
        <div className="space-y-2">
          {topProducts.length ? (
            topProducts.map(renderProductRow)
          ) : (
            <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">No product details available</div>
          )}
        </div>
      </section>

      {lowStockItems.length > 0 && (
        <section className="mb-4">
          <h3 className="section-title-2026 text-amber-600">Low Stock Alert ({lowStock})</h3>
          <div className="space-y-2">
            {lowStockItems.map(renderLowStockRow)}
          </div>
        </section>
      )}
    </div>
  );

  return (
    <Widget
      title={t('widgets.products.title')}
      drawerTitle={selectedProduct ? 'Product detail' : 'Product CRM details'}
      isExpanded={isExpanded}
      onExpand={() => {
        setSelectedProductCode(null);
        setIsExpanded(true);
      }}
      onCollapse={() => {
        setSelectedProductCode(null);
        setIsExpanded(false);
      }}
      compactContent={compactContent}
      expandedContent={expandedContent}
    >
      <div className="dashboard-widget-2026 p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">{t('widgets.products.topSelling')}</div>
            <div className="font-semibold text-indigo-600 truncate">{topSelling}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">Trending</div>
            <div className="font-semibold text-blue-600">{newWeek}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">{t('widgets.products.lowStock')}</div>
            <div className={`font-semibold ${lowStock > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowStock}</div>
          </div>
        </div>
        <div className="space-y-2">
          {topProducts.length ? (
            topProducts.map(renderProductRow)
          ) : (
            <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">No product details available</div>
          )}
        </div>
      </div>
    </Widget>
  );
}
