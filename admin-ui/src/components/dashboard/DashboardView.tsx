import type { DashboardHomeViewModel } from '../../services/dashboard-analytics.service';
import {
  CustomersWidgetSkeleton,
  ProductsWidgetSkeleton,
  SalesWidgetSkeleton,
  WidgetSkeleton,
} from '../ui/WidgetSkeleton';
import { DashboardWrapper } from './DashboardWrapper';

interface DashboardViewProps {
  data: DashboardHomeViewModel | null | undefined;
  reload: () => void;
  onNavigate: (tab: string, params?: Record<string, string | number>) => void;
}

export function DashboardView({ data, reload, onNavigate }: DashboardViewProps) {
  // Loading state - show skeletons while data is being fetched
  if (data === undefined || data === null) {
    return (
      <div className="dashboard-loading animate-fade-in-up" style={{ padding: '24px' }}>
        <div
          className="dashboard-grid-2026"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          <SalesWidgetSkeleton />
          <CustomersWidgetSkeleton />
          <ProductsWidgetSkeleton />
          <WidgetSkeleton type="marketing" />
          <WidgetSkeleton type="loyalty" />
          <WidgetSkeleton type="attention" />
        </div>
      </div>
    );
  }

  // Data loaded - render actual dashboard
  return <DashboardWrapper data={data} onNavigate={onNavigate} />;
}
