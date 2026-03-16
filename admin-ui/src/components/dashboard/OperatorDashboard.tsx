import { Role } from '../../types/roles';
import { WidgetGrid } from '../WidgetGrid';
import { getAvailableWidgets } from './widgetRegistry';

interface DashboardProps {
  data?: {
    operational?: any;
    customers?: any;
    products?: any;
    marketing?: any;
    integrations?: any;
  } | null;
  onNavigate?: (tab: string, params?: Record<string, string | number>) => void;
}

export function OperatorDashboard({ data, onNavigate }: DashboardProps) {
  const role = Role.OPERATOR;
  const widgets = getAvailableWidgets(role);
  const widgetData = {
    customers: data?.customers,
    products: data?.products,
    sales: data?.operational,
    integrations: data?.integrations,
    marketing: data?.marketing,
    analytics: data,
  };

  return (
    <div className="operator-dashboard">
      <WidgetGrid role={role} widgets={widgets} data={widgetData} />
    </div>
  );
}
