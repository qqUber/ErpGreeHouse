/**
 * Widget skeleton loading components
 * Provides consistent loading UI across all dashboard widgets
 */

export function WidgetSkeleton({ type }: { type: string }) {
  return (
    <div
      className="widget-skeleton"
      data-testid={`${type}-widget-skeleton`}
    >
      {/* Header skeleton */}
      <div className="widget-skeleton-header" />

      {/* Content skeleton lines */}
      <div className="widget-skeleton-content">
        <div className="widget-skeleton-line" style={{ width: '100%' }} />
        <div className="widget-skeleton-line" style={{ width: '80%' }} />
        <div className="widget-skeleton-line" style={{ width: '60%' }} />
      </div>

      {/* Number/stat skeleton */}
      <div className="widget-skeleton-stats">
        <div className="widget-skeleton-stat" />
        <div className="widget-skeleton-stat" />
      </div>
    </div>
  );
}

export function SalesWidgetSkeleton() {
  return (
    <div className="widget-skeleton widget-skeleton-sales" data-testid="sales-widget-skeleton">
      <div className="widget-skeleton-title" />
      <div className="widget-skeleton-metrics">
        <div className="widget-skeleton-metric" />
        <div className="widget-skeleton-metric" />
      </div>
      <div className="widget-skeleton-chart" />
    </div>
  );
}

export function CustomersWidgetSkeleton() {
  return (
    <div className="widget-skeleton widget-skeleton-customers" data-testid="customers-widget-skeleton">
      <div className="widget-skeleton-title" />
      <div className="widget-skeleton-cards">
        <div className="widget-skeleton-card" />
        <div className="widget-skeleton-card" />
      </div>
      <div className="widget-skeleton-list" />
    </div>
  );
}

export function ProductsWidgetSkeleton() {
  return (
    <div className="widget-skeleton widget-skeleton-products" data-testid="products-widget-skeleton">
      <div className="widget-skeleton-title" />
      <div className="widget-skeleton-grid">
        <div className="widget-skeleton-grid-item" />
        <div className="widget-skeleton-grid-item" />
        <div className="widget-skeleton-grid-item" />
        <div className="widget-skeleton-grid-item" />
      </div>
    </div>
  );
}

export function CompactWidgetSkeleton() {
  return (
    <div className="widget-skeleton widget-skeleton-compact" data-testid="compact-widget-skeleton">
      <div className="widget-skeleton-icon" />
      <div className="widget-skeleton-text">
        <div className="widget-skeleton-line-short" />
        <div className="widget-skeleton-line-shorter" />
      </div>
    </div>
  );
}
