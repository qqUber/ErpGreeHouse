import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../ui/StatCard';
import { Widget } from '../Widget';

type ProductsData = {
  top_products_today?: Array<{ code?: string; name?: string; quantity?: number; revenue?: number }>;
  trending_products?: Array<{
    code?: string;
    name?: string;
    growth_percent?: number;
    this_week?: number;
    last_week?: number;
  }>;
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
  const lowStock = Math.max(0, total - newWeek + 1);
  const selectedProduct =
    topProducts.find((product: any) => (product.code ?? product.name) === selectedProductCode) ??
    null;

  const compactContent = (
    <div className="crm-widget-compact">
      <div className="crm-kpi-grid">
        <StatCard variant="success" value={total} label={t('widgets.products.activeProducts')} />
        <StatCard variant="info" value={trendingCount} label={t('widgets.products.trendingNow')} />
        <StatCard
          variant="warning"
          value={demandSignal}
          label={t('widgets.products.demandSignal')}
        />
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
      className="crm-product-row"
      onClick={() => setSelectedProductCode(product.code ?? product.name ?? null)}
    >
      <div className="crm-product-main">
        <span className="crm-customer-id">{product.code ?? '--'}</span>
        <span className="crm-customer-name">
          {product.name ?? t('widgets.products.unnamedProduct')}
        </span>
      </div>
      <div className="crm-customer-badges">
        {Number.isFinite(Number(product.quantity)) && (
          <span className="crm-badge crm-badge-value">
            {t('widgets.products.quantity')} {Number(product.quantity ?? 0)}
          </span>
        )}
        {Number.isFinite(Number(product.revenue)) && (
          <span className="crm-badge crm-badge-good">
            {t('widgets.products.revenue')} {Number(product.revenue ?? 0).toLocaleString()}
          </span>
        )}
        {Number.isFinite(Number(product.growth_percent)) && (
          <span className="crm-badge crm-badge-channel">
            {t('widgets.products.trend')} {Number(product.growth_percent ?? 0)}%
          </span>
        )}
      </div>
    </button>
  );

  const expandedContent = (
    <div className="crm-drawer-stack">
      <section className="crm-detail-card">
        <div className="crm-detail-head">
          <h3 className="crm-section-title">
            {selectedProduct ? 'Product profile' : 'Product overview'}
          </h3>
          {selectedProduct ? (
            <button
              type="button"
              className="crm-inline-back"
              onClick={() => setSelectedProductCode(null)}
            >
              Back to list
            </button>
          ) : null}
        </div>
        <div className="crm-detail-grid">
          {selectedProduct ? (
            <>
              <div>
                <span>Code</span>
                <strong>{selectedProduct.code ?? '—'}</strong>
              </div>
              <div>
                <span>Name</span>
                <strong>{selectedProduct.name ?? '—'}</strong>
              </div>
              <div>
                <span>Quantity</span>
                <strong>{Number(selectedProduct.quantity ?? 0)}</strong>
              </div>
              <div>
                <span>Revenue</span>
                <strong>{Number(selectedProduct.revenue ?? 0).toLocaleString()}</strong>
              </div>
            </>
          ) : (
            <>
              <div>
                <span>Total Products</span>
                <strong>{total}</strong>
              </div>
              <div>
                <span>Trending</span>
                <strong>{trendingCount}</strong>
              </div>
              <div>
                <span>Demand Signal</span>
                <strong>{demandSignal}</strong>
              </div>
              <div>
                <span>Low Stock Risk</span>
                <strong>{lowStock > 0 ? 'Watchlist' : 'Healthy'}</strong>
              </div>
            </>
          )}
        </div>
      </section>
      <section className="crm-collapsible-section">
        <h3 className="crm-section-title">Top products</h3>
        <div className="crm-list">
          {topProducts.length ? (
            topProducts.map(renderProductRow)
          ) : (
            <div className="crm-empty-state">No product details available</div>
          )}
        </div>
      </section>
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
      <div className="crm-widget-body">
        <div className="crm-inline-stats">
          <span>
            {t('widgets.products.topSelling')}: <strong>{topSelling}</strong>
          </span>
          <span>
            Trending: <strong>{newWeek}</strong>
          </span>
          <span>
            {t('widgets.products.lowStock')}: <strong>{lowStock}</strong>
          </span>
        </div>
        <div className="crm-list-preview">
          {topProducts.length ? (
            topProducts.map(renderProductRow)
          ) : (
            <div className="crm-empty-state">No product details available</div>
          )}
        </div>
      </div>
    </Widget>
  );
}
