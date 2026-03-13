import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../ui/StatCard';
import { Widget } from '../Widget';

type ProductsData = {
  top_products_today?: Array<{ code?: string; name?: string; quantity?: number; revenue?: number }>;
  trending_products?: Array<{ code?: string; name?: string; growth_percent?: number; this_week?: number; last_week?: number }>;
};

export function ProductsWidget({ data }: { data?: ProductsData }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);
  
  // NaN guards: ensure all numeric values are valid
  const topProducts = data?.top_products_today ?? [];
  const trendingProducts = data?.trending_products ?? [];
  const total = Number.isFinite(topProducts.length) ? Number(topProducts.length) : 0;
  const trendingCount = (data?.trending_products || []).filter((p) => {
    const growth = Number(p?.growth_percent || 0);
    return Number.isFinite(growth) && growth > 0;
  }).length;
  const newWeek = Number.isFinite(trendingCount) ? trendingCount : 0;
  const topSelling = topProducts[0]?.name || t('widgets.products.espresso');
  const demandSignal = topProducts.reduce((acc, item) => acc + Number(item.quantity ?? 0), 0);
  const lowStock = Math.max(0, total - newWeek + 1);
  const selectedProduct =
    topProducts.find((p) => p.code === selectedProductCode) ??
    trendingProducts.find((p) => p.code === selectedProductCode) ??
    null;

  const compactContent = (
    <div className="crm-widget-compact">
      <div className="crm-kpi-grid">
        <StatCard variant="success" value={total} label={t('widgets.products.activeProducts')} />
        <StatCard variant="info" value={trendingCount} label="Trending now" />
        <StatCard variant="warning" value={demandSignal} label="Demand signal" />
      </div>
    </div>
  );

  const renderProductRow = (product: { code?: string; name?: string; quantity?: number; revenue?: number; growth_percent?: number }) => (
    <button
      key={`${product.code ?? product.name}`}
      type="button"
      className="crm-product-row"
      onClick={() => setSelectedProductCode(product.code ?? product.name ?? null)}
    >
      <div className="crm-product-main">
        <span className="crm-customer-id">{product.code ?? '--'}</span>
        <span className="crm-customer-name">{product.name ?? 'Unnamed product'}</span>
      </div>
      <div className="crm-customer-badges">
        {Number.isFinite(Number(product.quantity)) && (
          <span className="crm-badge crm-badge-value">Qty {Number(product.quantity ?? 0)}</span>
        )}
        {Number.isFinite(Number(product.revenue)) && (
          <span className="crm-badge crm-badge-good">Rev {Number(product.revenue ?? 0).toLocaleString()}</span>
        )}
        {Number.isFinite(Number(product.growth_percent)) && (
          <span className="crm-badge crm-badge-channel">Trend {Number(product.growth_percent ?? 0)}%</span>
        )}
      </div>
    </button>
  );

  const expandedContent = (
    <div className="crm-drawer-stack">
      {selectedProduct ? (
        <section className="crm-detail-card">
          <div className="crm-detail-head">
            <h3 className="crm-section-title">Product detail</h3>
            <button
              type="button"
              className="crm-inline-back"
              onClick={() => setSelectedProductCode(null)}
            >
              Back to list
            </button>
          </div>
          <div className="crm-detail-grid">
            <div><span>Code</span><strong>{selectedProduct.code ?? '-'}</strong></div>
            <div><span>Name</span><strong>{selectedProduct.name ?? '-'}</strong></div>
            <div><span>Demand signal</span><strong>{Number((selectedProduct as any).quantity ?? (selectedProduct as any).this_week ?? 0)}</strong></div>
            <div><span>Trend</span><strong>{Number((selectedProduct as any).growth_percent ?? 0)}%</strong></div>
            <div><span>Revenue</span><strong>{Number((selectedProduct as any).revenue ?? 0).toLocaleString()}</strong></div>
            <div><span>Customer context</span><strong>Most active among repeat buyers (fallback)</strong></div>
            <div><span>Stock signal</span><strong>{lowStock > 0 ? 'Watchlist' : 'Healthy'}</strong></div>
          </div>
        </section>
      ) : (
        <>
          <section className="crm-collapsible-section">
            <h3 className="crm-section-title">Top sellers</h3>
            <div className="crm-list">{topProducts.length ? topProducts.map(renderProductRow) : <p className="crm-empty-state">No top products in payload.</p>}</div>
          </section>
          <section className="crm-collapsible-section">
            <h3 className="crm-section-title">Trending</h3>
            <div className="crm-list">{trendingProducts.length ? trendingProducts.map(renderProductRow) : <p className="crm-empty-state">No trending products in payload.</p>}</div>
          </section>
          <section className="crm-collapsible-section">
            <h3 className="crm-section-title">Low stock / risk</h3>
            <div className="crm-inline-stats">
              <span>Low stock risk: <strong>{lowStock}</strong></span>
              <span>Top seller: <strong>{topSelling}</strong></span>
            </div>
          </section>
        </>
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
      <div className="crm-widget-body">
        <div className="crm-inline-stats">
          <span>{t('widgets.products.topSelling')}: <strong>{topSelling}</strong></span>
          <span>Trending: <strong>{newWeek}</strong></span>
          <span>{t('widgets.products.lowStock')}: <strong>{lowStock}</strong></span>
        </div>
        <div className="crm-list-preview">
          {topProducts.slice(0, 3).map(renderProductRow)}
        </div>
      </div>
    </Widget>
  );
}
