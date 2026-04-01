/**
 * Widget skeleton loading components
 * Provides consistent loading UI across all dashboard widgets
 */

export function WidgetSkeleton({ type }: { type: string }) {
  return (
    <div
      style={{
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        minHeight: '200px',
      }}
      data-testid={`${type}-widget-skeleton`}
    >
      {/* Header skeleton */}
      <div
        style={{
          height: '20px',
          width: '40%',
          background: '#e5e7eb',
          borderRadius: '4px',
          marginBottom: '16px',
        }}
      />

      {/* Content skeleton lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{ height: '16px', width: '100%', background: '#f3f4f6', borderRadius: '4px' }}
        />
        <div style={{ height: '16px', width: '80%', background: '#f3f4f6', borderRadius: '4px' }} />
        <div style={{ height: '16px', width: '60%', background: '#f3f4f6', borderRadius: '4px' }} />
      </div>

      {/* Number/stat skeleton */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '16px' }}>
        <div
          style={{ height: '40px', width: '80px', background: '#e5e7eb', borderRadius: '8px' }}
        />
        <div
          style={{ height: '40px', width: '80px', background: '#e5e7eb', borderRadius: '8px' }}
        />
      </div>
    </div>
  );
}

export function SalesWidgetSkeleton() {
  return (
    <div
      style={{
        padding: '24px',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}
      data-testid="sales-widget-skeleton"
    >
      <div
        style={{
          height: '24px',
          width: '120px',
          background: '#e5e7eb',
          borderRadius: '4px',
          marginBottom: '20px',
        }}
      />
      <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
        <div
          style={{ height: '60px', width: '100px', background: '#e5e7eb', borderRadius: '8px' }}
        />
        <div
          style={{ height: '60px', width: '100px', background: '#e5e7eb', borderRadius: '8px' }}
        />
      </div>
      <div style={{ height: '80px', background: '#f3f4f6', borderRadius: '8px' }} />
    </div>
  );
}

export function CustomersWidgetSkeleton() {
  return (
    <div
      style={{
        padding: '24px',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}
      data-testid="customers-widget-skeleton"
    >
      <div
        style={{
          height: '24px',
          width: '140px',
          background: '#e5e7eb',
          borderRadius: '4px',
          marginBottom: '20px',
        }}
      />
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ height: '50px', flex: 1, background: '#e5e7eb', borderRadius: '8px' }} />
        <div style={{ height: '50px', flex: 1, background: '#e5e7eb', borderRadius: '8px' }} />
      </div>
      <div style={{ height: '120px', background: '#f3f4f6', borderRadius: '8px' }} />
    </div>
  );
}

export function ProductsWidgetSkeleton() {
  return (
    <div
      style={{
        padding: '24px',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}
      data-testid="products-widget-skeleton"
    >
      <div
        style={{
          height: '24px',
          width: '130px',
          background: '#e5e7eb',
          borderRadius: '4px',
          marginBottom: '20px',
        }}
      />
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div
          style={{
            height: '80px',
            flex: '1 1 45%',
            minWidth: '150px',
            background: '#e5e7eb',
            borderRadius: '8px',
          }}
        />
        <div
          style={{
            height: '80px',
            flex: '1 1 45%',
            minWidth: '150px',
            background: '#e5e7eb',
            borderRadius: '8px',
          }}
        />
        <div
          style={{
            height: '80px',
            flex: '1 1 45%',
            minWidth: '150px',
            background: '#e5e7eb',
            borderRadius: '8px',
          }}
        />
        <div
          style={{
            height: '80px',
            flex: '1 1 45%',
            minWidth: '150px',
            background: '#e5e7eb',
            borderRadius: '8px',
          }}
        />
      </div>
    </div>
  );
}

export function CompactWidgetSkeleton() {
  return (
    <div
      style={{
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
      data-testid="compact-widget-skeleton"
    >
      <div style={{ height: '40px', width: '40px', background: '#e5e7eb', borderRadius: '8px' }} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: '16px',
            width: '60%',
            background: '#e5e7eb',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        />
        <div style={{ height: '12px', width: '40%', background: '#f3f4f6', borderRadius: '4px' }} />
      </div>
    </div>
  );
}
